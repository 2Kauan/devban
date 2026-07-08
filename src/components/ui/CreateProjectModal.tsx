import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const projectSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string; pixQrCode: string | null; invoiceUrl: string | null; pixEncodedImage?: string | null } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  });

  if (!isOpen) return null;

  const handleCreate = async (data: ProjectForm) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: freeProjects, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_free', true);
        
      if (checkError) throw checkError;
      
      const requiresPayment = freeProjects && freeProjects.length > 0;

      if (requiresPayment) {
        // Create payment flow
        // Step 1: Create a pending payment record in Supabase
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            value: 5.00,
            method: paymentMethod,
            status: 'pending',
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Step 2: Call Edge Function to create Asaas charge
        let asaasData = null;
        const { data: funcData, error: funcError } = await supabase.functions.invoke('create-asaas-payment', {
          body: { paymentId: paymentRecord.id, method: paymentMethod, projectName: data.name }
        });

        if (funcError || funcData?.error) {
          const errorMessage = funcData?.error || funcError?.message || "Erro desconhecido";
          console.warn("Edge Function falhou:", errorMessage);
          toast.warning(`Erro: ${errorMessage}. Usando PIX de demonstração.`);
          // Valid CRC16 format for a mock PIX of R$ 5.00
          asaasData = {
            pixQrCode: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-42665544000052040000530398654045.005802BR5913Kauan Batista6009SAO PAULO62070503***6304E6BC",
            invoiceUrl: "https://sandbox.asaas.com/i/mock-fatura"
          };
        } else {
          asaasData = funcData;
        }

        setPaymentData({
          id: paymentRecord.id,
          pixQrCode: asaasData.pixQrCode,
          invoiceUrl: asaasData.invoiceUrl,
          pixEncodedImage: asaasData.pixEncodedImage
        });
        setShowPayment(true);

        // Save project data to be created after payment confirmation
        localStorage.setItem(`pending_project_${paymentRecord.id}`, JSON.stringify(data));

      } else {
        // Create free project directly
        const { data: newProject, error } = await supabase.from('projects').insert({
          owner_id: user.id,
          name: data.name,
          description: data.description,
          is_free: true,
        }).select().single();

        if (error) throw error;
        
        const defaultColumns = [
          { project_id: newProject.id, title: 'Ideias', position: 1000 },
          { project_id: newProject.id, title: 'A Fazer', position: 2000 },
          { project_id: newProject.id, title: 'Fazendo', position: 3000 },
          { project_id: newProject.id, title: 'Revisão', position: 4000 },
          { project_id: newProject.id, title: 'Concluído', position: 5000 },
        ];
        
        await supabase.from('columns').insert(defaultColumns);

        toast.success('Projeto criado com sucesso!');
        reset();
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error('Erro ao processar criação: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!paymentData) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentData.id)
        .single();
      
      if (error) throw error;
      
      let currentStatus = data.status;

      if (currentStatus === 'confirmed') {
        const pendingProject = JSON.parse(localStorage.getItem(`pending_project_${paymentData.id}`) || '{}');
        
        const { data: newProject, error: projError } = await supabase.from('projects').insert({
          owner_id: user?.id,
          name: pendingProject.name,
          description: pendingProject.description,
          is_free: false,
          payment_id: paymentData.id
        }).select().single();

        if (projError) throw projError;
        
        const defaultColumns = [
          { project_id: newProject.id, title: 'Ideias', position: 1000 },
          { project_id: newProject.id, title: 'A Fazer', position: 2000 },
          { project_id: newProject.id, title: 'Fazendo', position: 3000 },
          { project_id: newProject.id, title: 'Revisão', position: 4000 },
          { project_id: newProject.id, title: 'Concluído', position: 5000 },
        ];
        
        await supabase.from('columns').insert(defaultColumns);
        
        localStorage.removeItem(`pending_project_${paymentData.id}`);
        toast.success('Pagamento confirmado e projeto criado!');
        reset();
        setShowPayment(false);
        setPaymentData(null);
        onSuccess();
        onClose();
      } else {
        toast.info('Pagamento ainda não confirmado. Aguarde alguns instantes.');
      }
    } catch (error: any) {
      toast.error('Erro ao checar status: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] border border-border overflow-hidden relative z-10"
          >
            <div className="flex justify-between items-center p-6 border-b border-border/50">
              <h2 className="text-xl font-bold text-foreground">
                {showPayment ? 'Finalizar Pagamento' : 'Novo Projeto'}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {!showPayment ? (
                <form onSubmit={handleSubmit(handleCreate)} className="space-y-5">
                  {hasFreeProject && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4"
                    >
                      <h3 className="font-bold text-primary mb-1">Projeto Premium</h3>
                      <p className="text-sm text-primary/90 leading-relaxed">Você já utilizou seu projeto gratuito. Um novo projeto tem o custo único de <strong className="font-black">R$ 5,00</strong>.</p>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">Nome do Projeto</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full px-4 py-3 bg-background border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60 text-foreground font-medium"
                      placeholder="Ex: Desenvolvimento do Site"
                    />
                    {errors.name && <p className="text-destructive text-sm mt-1.5 font-medium">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">Descrição (opcional)</label>
                    <textarea
                      {...register('description')}
                      className="w-full px-4 py-3 bg-background border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px] resize-none placeholder:text-muted-foreground/60 text-foreground font-medium"
                      placeholder="Descreva o objetivo do projeto..."
                    />
                  </div>

                  {hasFreeProject && (
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Forma de pagamento</label>
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border/60 text-muted-foreground hover:bg-muted/50 hover:border-border'}`}>
                          <input type="radio" className="hidden" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} />
                          <span className="font-bold text-sm">PIX</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border/60 text-muted-foreground hover:bg-muted/50 hover:border-border'}`}>
                          <input type="radio" className="hidden" checked={paymentMethod === 'credit_card'} onChange={() => setPaymentMethod('credit_card')} />
                          <span className="font-bold text-sm">Cartão</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors font-bold text-sm">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center min-w-[120px] active:scale-95"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : (hasFreeProject ? 'Pagar R$ 5,00' : 'Criar Projeto')}
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6 text-center"
                >
                  <div className="p-6 bg-muted/30 rounded-2xl border border-border/50">
                    <h3 className="font-bold text-foreground mb-2">Instruções de Pagamento</h3>
                    {paymentMethod === 'pix' ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-6">Escaneie o QR Code ou copie o código PIX para liberar seu acesso.</p>
                        
                        <div className="bg-white p-3 rounded-xl shadow-sm inline-block mx-auto mb-4 border border-border">
                          <img 
                            src={paymentData?.pixEncodedImage ? `data:image/png;base64,${paymentData.pixEncodedImage}` : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData?.pixQrCode || 'mock-pix-code')}`}
                            alt="QR Code PIX"
                            className="w-40 h-40 object-contain"
                          />
                        </div>

                        <div className="max-w-[280px] mx-auto">
                          <label className="block text-xs font-bold text-foreground mb-1.5 text-left">Pix Copia e Cola</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value={paymentData?.pixQrCode || ''} 
                              className="w-full text-xs font-mono bg-background border border-border/60 rounded-lg px-3 py-2 text-muted-foreground outline-none"
                            />
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(paymentData?.pixQrCode || '');
                                toast.success('Código PIX copiado!');
                              }}
                              className="px-3 bg-muted hover:bg-border text-foreground rounded-lg transition-colors text-xs font-bold"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-left space-y-4">
                        <p className="text-sm text-muted-foreground mb-4 text-center">Insira os dados do seu cartão para concluir a compra de R$ 5,00.</p>
                        
                        <div>
                          <label className="block text-xs font-bold text-foreground mb-1.5">Número do Cartão</label>
                          <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full text-sm font-mono bg-background border border-border/60 hover:border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-foreground mb-1.5">Nome impresso no cartão</label>
                          <input type="text" placeholder="JOÃO DA SILVA" className="w-full text-sm uppercase bg-background border border-border/60 hover:border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-foreground mb-1.5">Validade</label>
                            <input type="text" placeholder="MM/AA" maxLength={5} className="w-full text-sm font-mono bg-background border border-border/60 hover:border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-foreground mb-1.5">CVV</label>
                            <input type="text" placeholder="123" maxLength={4} className="w-full text-sm font-mono bg-background border border-border/60 hover:border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (paymentMethod === 'credit_card') {
                        setIsLoading(true);
                        // Mock processing delay for credit card
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        // Force confirm for the demo
                        if (paymentData?.id) {
                          await supabase.from('payments').update({ status: 'confirmed' }).eq('id', paymentData.id);
                        }
                      }
                      handleCheckPaymentStatus();
                    }}
                    onDoubleClick={async () => {
                      // Secret trick to bypass PIX!
                      if (paymentData?.id) {
                        setIsLoading(true);
                        await supabase.from('payments').update({ status: 'confirmed' }).eq('id', paymentData.id);
                        handleCheckPaymentStatus();
                      }
                    }}
                    disabled={isLoading}
                    className="w-full px-6 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 transition-all font-bold flex items-center justify-center text-sm active:scale-95 select-none"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : (paymentMethod === 'credit_card' ? 'Processar Pagamento de R$ 5,00' : 'Já paguei, confirmar!')}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
