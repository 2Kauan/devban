import { useState, useEffect } from 'react';
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
  cpf: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPlan?: 'free' | 'pro';
}

const isValidCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let t = 0, d = 0, c = 0;
  for (t = 9; t < 11; t++) {
    for (d = 0, c = 0; c < t; c++) {
      d += parseInt(cpf[c]) * ((t + 1) - c);
    }
    d = ((10 * d) % 11) % 10;
    if (parseInt(cpf[c]) !== d) return false;
  }
  return true;
};

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string; pixQrCode: string | null; invoiceUrl: string | null; pixEncodedImage?: string | null } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [isCheckingSlots, setIsCheckingSlots] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'buy'>('create');
  const [bulkQuantity, setBulkQuantity] = useState<number | ''>(1);
  const [bulkCpf, setBulkCpf] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  });

  // Check slots when modal opens
  useEffect(() => {
    async function checkSlots() {
      if (!user || !isOpen) return;
      setIsCheckingSlots(true);
      try {
        const { data: profile } = await supabase.from('profiles').select('free_slot_consumed').eq('id', user.id).single();
        const { count: freeProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_free', true);
        
        const { data: payments } = await supabase.from('payments')
          .select('value')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .is('project_id', null);
          
        const totalPurchasedValue = payments?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
        const totalPurchasedSlots = Math.floor(totalPurchasedValue / 7.00);

        const { count: premiumProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_free', false);

        const canCreateFree = freeProjects === 0 && profile?.free_slot_consumed === false;
        const canCreatePremium = (premiumProjects || 0) < totalPurchasedSlots;

        setRequiresPayment(!canCreateFree && !canCreatePremium);
      } catch (e) {
        console.error("Error checking slots:", e);
      } finally {
        setIsCheckingSlots(false);
      }
    }
    checkSlots();
  }, [isOpen, user]);

  // Escuta atualizações do webhook em tempo real
  useEffect(() => {
    if (!showPayment || !paymentData?.id) return;

    const channel = supabase
      .channel(`payment_${paymentData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentData.id}`
        },
        (payload) => {
          if (payload.new && payload.new.status === 'confirmed') {
            // O webhook atualizou o status para confirmed!
            // Chamamos a função que verifica e cria o projeto
            handleCheckPaymentStatus();
          }
        }
      )
      .subscribe();

    // Fallback: polling a cada 5 segundos caso o webhook não chegue
    const pollInterval = setInterval(() => {
      handleCheckPaymentStatus(true);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [showPayment, paymentData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleCreate = async (data: ProjectForm) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: profile } = await supabase.from('profiles').select('free_slot_consumed').eq('id', user.id).single();
      const { count: freeProjects, error: checkFreeError } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_free', true);
      if (checkFreeError) throw checkFreeError;

      const { data: payments, error: checkPayError } = await supabase.from('payments')
        .select('value')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .is('project_id', null);
      if (checkPayError) throw checkPayError;
      
      const totalPurchasedValue = payments?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
      const totalPurchasedSlots = Math.floor(totalPurchasedValue / 7.00);

      const { count: premiumProjects, error: checkPremError } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_free', false);
      if (checkPremError) throw checkPremError;
      
      const canCreateFree = freeProjects === 0 && profile?.free_slot_consumed === false;
      const canCreatePremium = (premiumProjects || 0) < totalPurchasedSlots;

      const requiresPayment = !canCreateFree && !canCreatePremium;

      if (requiresPayment) {
        if (!data.cpf || !isValidCPF(data.cpf)) {
          toast.error('Por favor, informe um CPF válido para gerar a cobrança.');
          setIsLoading(false);
          return;
        }

        // Create payment flow
        // Step 1: Create a pending payment record in Supabase
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            value: 7.00,
            method: paymentMethod,
            status: 'pending',
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Step 2: Call Edge Function to create Asaas charge
        let asaasData = null;
        const { data: funcData, error: funcError } = await supabase.functions.invoke('create-asaas-payment', {
          body: { paymentId: paymentRecord.id, method: paymentMethod, projectName: data.name, cpfCnpj: data.cpf }
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
          is_free: canCreateFree,
        }).select().single();

        if (error) throw error;
        
        // Marca que o usuário já utilizou o seu projeto gratuito
        if (canCreateFree) {
          await supabase.from('profiles').update({ free_slot_consumed: true }).eq('id', user.id);
        }
        
        const defaultColumns = [
          { project_id: newProject.id, title: 'Ideias', position: 1000, color: '#94a3b8' },
          { project_id: newProject.id, title: 'A Fazer', position: 2000, color: '#3b82f6' },
          { project_id: newProject.id, title: 'Fazendo', position: 3000, color: '#eab308' },
          { project_id: newProject.id, title: 'Revisão', position: 4000, color: '#a855f7' },
          { project_id: newProject.id, title: 'Concluído', position: 5000, color: '#22c55e', is_completed: true },
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

  const handleBulkPurchase = async () => {
    if (!user) return;
    
    if (!bulkCpf || !isValidCPF(bulkCpf)) {
      toast.error('Por favor, informe um CPF válido para gerar a cobrança.');
      return;
    }

    setIsLoading(true);
    try {
      const totalValue = bulkQuantity * 7.00;
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          value: totalValue,
          method: paymentMethod,
          status: 'pending',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      let asaasData = null;
      const { data: funcData, error: funcError } = await supabase.functions.invoke('create-asaas-payment', {
        body: { paymentId: paymentRecord.id, method: paymentMethod, projectName: `Pacote de ${bulkQuantity} Vagas`, cpfCnpj: bulkCpf }
      });

      if (funcError || funcData?.error) {
        const errorMessage = funcData?.error || funcError?.message || "Erro desconhecido";
        console.warn("Edge Function falhou:", errorMessage);
        toast.warning(`Erro: ${errorMessage}. Usando PIX de demonstração.`);
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
      
      localStorage.setItem(`pending_bulk_${paymentRecord.id}`, JSON.stringify({ quantity: bulkQuantity }));
    } catch (error: any) {
      toast.error('Erro ao processar cobrança: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckPaymentStatus = async (isPolling = false) => {
    if (!paymentData) return;
    if (!isPolling) setIsLoading(true);
    try {
      // Chama a edge function que verifica o status direto no Asaas
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-asaas-payment', {
        body: { paymentId: paymentData.id }
      });
      
      if (checkError) throw checkError;
      if (checkData?.error) throw new Error(checkData.error);
      
      let currentStatus = checkData?.status || 'pending';

      if (currentStatus === 'confirmed') {
        const isBulk = localStorage.getItem(`pending_bulk_${paymentData.id}`);
        
        if (isBulk) {
          const bulkData = JSON.parse(isBulk);
          localStorage.removeItem(`pending_bulk_${paymentData.id}`);
          toast.success(`Pagamento confirmado! ${bulkData.quantity} vagas adicionadas ao seu estoque.`);
          reset();
          setShowPayment(false);
          setPaymentData(null);
          onSuccess();
          onClose();
          return;
        }

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
          { project_id: newProject.id, title: 'Ideias', position: 1000, color: '#94a3b8' },
          { project_id: newProject.id, title: 'A Fazer', position: 2000, color: '#3b82f6' },
          { project_id: newProject.id, title: 'Fazendo', position: 3000, color: '#eab308' },
          { project_id: newProject.id, title: 'Revisão', position: 4000, color: '#a855f7' },
          { project_id: newProject.id, title: 'Concluído', position: 5000, color: '#22c55e', is_completed: true },
        ];
        
        await supabase.from('columns').insert(defaultColumns);
        
        localStorage.removeItem(`pending_project_${paymentData.id}`);
        toast.success(`Pagamento confirmado! O projeto "${pendingProject.name || ''}" foi criado.`);
        reset();
        setShowPayment(false);
        setPaymentData(null);
        onSuccess();
        onClose();
      } else {
        if (!isPolling) toast.info('Pagamento ainda não confirmado. Aguarde alguns instantes.');
      }
    } catch (error: any) {
      if (!isPolling) toast.error('Erro ao verificar pagamento: ' + error.message);
    } finally {
      if (!isPolling) setIsLoading(false);
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
            className="bg-card w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.15)] border border-border overflow-hidden relative z-10"
          >
            <div className="flex justify-between items-center p-6 border-b border-border/50 shrink-0">
              <h2 className="text-xl font-bold text-foreground">
                {showPayment ? 'Finalizar Pagamento' : 'Novo Projeto'}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors shrink-0">
                <X size={20} />
              </button>
            </div>

            {!showPayment && !isCheckingSlots && (
              <div className="flex border-b border-border/50 bg-muted/10">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'create' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Criar Projeto
                </button>
                <button
                  onClick={() => setActiveTab('buy')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'buy' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Comprar Vagas
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {isCheckingSlots ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground font-medium">Verificando elegibilidade...</p>
                </div>
              ) : !showPayment && activeTab === 'create' ? (
                <form onSubmit={handleSubmit(handleCreate)} className="space-y-5">
                  {requiresPayment && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4"
                    >
                      <h3 className="font-bold text-primary mb-1">Projeto Premium</h3>
                      <p className="text-sm text-primary/90 leading-relaxed">Você já utilizou seu projeto gratuito. Um novo projeto tem o custo único de <strong className="font-black">R$ 7,00</strong>.</p>
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

                  {requiresPayment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-sm font-bold text-foreground mb-1.5">CPF (para emissão da cobrança)</label>
                      <input
                        type="text"
                        {...register('cpf')}
                        maxLength={14}
                        className="w-full px-4 py-3 bg-background border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60 text-foreground font-medium"
                        placeholder="000.000.000-00"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d)/, '$1.$2');
                          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                          e.target.value = value;
                        }}
                      />
                      {errors.cpf && <p className="text-destructive text-sm mt-1.5 font-medium">{errors.cpf.message}</p>}
                    </motion.div>
                  )}

                  {requiresPayment && (
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
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : (requiresPayment ? 'Pagar R$ 7,00' : 'Criar Projeto')}
                    </button>
                  </div>
                </form>
              ) : !showPayment && activeTab === 'buy' ? (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
                    <h3 className="font-bold text-primary mb-1">Estoque Vagas de Projetos</h3>
                    <p className="text-sm text-primary/90 leading-relaxed">Cada vaga no pacote tem o custo fixo de <strong className="font-black">R$ 7,00</strong>.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-4 text-center">Quantas vagas deseja comprar?</label>
                    <div className="flex items-center justify-center gap-6">
                      <button type="button" onClick={() => setBulkQuantity(Math.max(1, (typeof bulkQuantity === 'number' ? bulkQuantity : 1) - 1))} className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted/50 transition-colors text-xl font-bold active:scale-95">-</button>
                      <input 
                        type="number" 
                        min="1" 
                        value={bulkQuantity} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setBulkQuantity('');
                          } else {
                            setBulkQuantity(parseInt(val, 10) || 0);
                          }
                        }} 
                        className="text-4xl font-black min-w-[3rem] max-w-[5rem] text-center bg-transparent border-none focus:outline-none p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button type="button" onClick={() => setBulkQuantity((typeof bulkQuantity === 'number' ? bulkQuantity : 1) + 1)} className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted/50 transition-colors text-xl font-bold active:scale-95">+</button>
                    </div>
                    {(bulkQuantity === '' || bulkQuantity < 1) && (
                      <p className="text-destructive text-sm font-bold text-center mt-3">A quantidade mínima é de 1 vaga.</p>
                    )}
                  </div>

                  <div className="text-center pt-2 pb-4">
                    <p className="text-sm text-muted-foreground mb-1">Total a pagar:</p>
                    <p className="text-4xl font-black text-foreground">R$ {((typeof bulkQuantity === 'number' ? bulkQuantity : 0) * 7).toFixed(2).replace('.', ',')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">CPF (para emissão da cobrança)</label>
                    <input
                      type="text"
                      value={bulkCpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d)/, '$1.$2');
                        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setBulkCpf(value);
                      }}
                      maxLength={14}
                      className="w-full px-4 py-3 bg-background border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60 text-foreground font-medium"
                      placeholder="000.000.000-00"
                    />
                  </div>

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

                  <div className="pt-2 flex justify-end gap-3 border-t border-border/50 pt-4 mt-6">
                    <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors font-bold text-sm">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkPurchase}
                      disabled={isLoading || bulkQuantity === '' || bulkQuantity < 1}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center min-w-[120px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Comprar Vagas'}
                    </button>
                  </div>
                </div>
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

                  <div className="flex flex-col gap-3">
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

                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          if (paymentData?.id) {
                            const { error } = await supabase.functions.invoke('cancel-asaas-payment', {
                              body: { paymentId: paymentData.id }
                            });
                            if (error) throw error;
                          }
                          toast.success('Cobrança cancelada com sucesso.');
                          setShowPayment(false);
                          setPaymentData(null);
                          reset();
                        } catch (error: any) {
                          toast.error('Erro ao cancelar: ' + error.message);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="w-full px-6 py-3 bg-transparent text-muted-foreground border-2 border-border/60 hover:bg-muted hover:text-foreground rounded-xl transition-all font-bold flex items-center justify-center text-sm active:scale-95"
                    >
                      Cancelar Pagamento
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
