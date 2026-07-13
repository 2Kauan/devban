import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { ArrowLeft, CheckCircle2, Shield, CreditCard, QrCode, Lock, Loader2, Sparkles, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ProjectCheckout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');
  const [isSuccess, setIsSuccess] = useState(false);
  const [pixData, setPixData] = useState<{qrCode: string, encodedImage: string, invoiceUrl: string} | null>(null);
  const [creditCardUrl, setCreditCardUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProject(data);
      } catch (error) {
        toast.error('Erro ao carregar projeto');
        navigate('/projects');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentRecordId) return;

    let isPollingActive = true;

    const handleCheckPaymentStatus = async () => {
      if (!isPollingActive) return;
      try {
        const { data: checkData, error: checkError } = await supabase.functions.invoke('check-asaas-payment', {
          body: { paymentId: paymentRecordId }
        });
        
        if (checkError || checkData?.error) return;
        
        if (checkData?.status === 'confirmed' && isPollingActive) {
          isPollingActive = false;
          
          const { error } = await supabase
            .from('projects')
            .update({ is_free: false, payment_id: paymentRecordId })
            .eq('id', project?.id);

          if (!error) {
            setIsSuccess(true);
            setTimeout(() => {
              toast.success('Pagamento aprovado! Inteligência Artificial liberada.');
              navigate(`/project/${project?.id}/ai`);
            }, 2500);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const channel = supabase
      .channel(`payment_${paymentRecordId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentRecordId}`
        },
        (payload) => {
          if (payload.new && payload.new.status === 'confirmed') {
            handleCheckPaymentStatus();
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      handleCheckPaymentStatus();
    }, 5000);

    return () => {
      isPollingActive = false;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [paymentRecordId, project?.id, navigate]);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      if (!project) return;
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // 1. Criar o registro de pagamento pendente no banco
      const { data: paymentRecord, error: insertError } = await supabase
        .from('payments')
        .insert({
          user_id: userData.user.id,
          project_id: project.id,
          value: 7.00,
          method: paymentMethod,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setPaymentRecordId(paymentRecord.id);

      // 2. Chamar a Edge Function para criar a cobrança no Asaas
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: { 
          method: paymentMethod, 
          paymentId: paymentRecord.id,
          projectName: project.name,
          cpfCnpj: '' // Deixamos vazio para testes, pode ser adicionado depois
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 3. Tratar a resposta
      if (paymentMethod === 'pix') {
        setPixData({
          qrCode: data.pixQrCode, // Código Copia e Cola
          encodedImage: data.pixEncodedImage, // Base64 da imagem
          invoiceUrl: data.invoiceUrl
        });
      } else {
        // Redireciona para o link de pagamento do cartão no Asaas
        if (data.invoiceUrl) {
          setCreditCardUrl(data.invoiceUrl);
          window.open(data.invoiceUrl, '_blank');
        }
      }

    } catch (error: any) {
      toast.error('Falha ao processar pagamento: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateApproval = async () => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from('projects')
        .update({ is_free: false })
        .eq('id', project?.id);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        toast.success('Pagamento aprovado! Inteligência Artificial liberada.');
        navigate(`/project/${project?.id}/ai`);
      }, 2500);
    } catch (error: any) {
      toast.error('Erro ao aprovar: ' + error.message);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background/50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Decorações de Fundo */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />

      {/* Coluna Esquerda - Resumo e Benefícios */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center border-r border-border/50 bg-card/30 backdrop-blur-sm relative z-10 min-h-[400px]">
        <button 
          onClick={() => navigate(`/project/${project.id}/ai`)}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="max-w-md mx-auto w-full space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-4">
              <Sparkles size={12} />
              UPGRADE DE PROJETO
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Desbloqueie o poder da IA
            </h1>
            <p className="text-muted-foreground text-lg">
              Faça o upgrade do projeto <strong className="text-foreground">"{project.name}"</strong> para ter acesso ilimitado às ferramentas de Inteligência Artificial do DevBan.
            </p>
          </div>

          <div className="space-y-4 bg-background/50 p-6 rounded-2xl border border-border/50">
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider mb-2">O que está incluso:</h3>
            <ul className="space-y-3">
              {[
                'Importação mágica de Documentos e PDFs',
                'OCR Avançado para ler imagens e quadros brancos',
                'Geração inteligente de Cards e Categorias',
                'Acesso prioritário aos servidores de processamento'
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-sm font-medium leading-tight">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Coluna Direita - Checkout */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center relative z-10">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              pixData ? (
                <motion.div
                  key="pix-payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border shadow-2xl rounded-3xl p-8 flex flex-col items-center text-center"
                >
                  <h3 className="text-xl font-bold mb-2 text-foreground">Escaneie o QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-6">Abra o app do seu banco e escaneie o código abaixo para pagar via PIX.</p>
                  
                  <div className="bg-white p-4 rounded-xl mb-6">
                    <img src={`data:image/jpeg;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-48 h-48" />
                  </div>

                  <div className="w-full relative mb-6">
                    <input 
                      type="text" 
                      readOnly 
                      value={pixData.qrCode} 
                      className="w-full bg-muted/50 border border-border rounded-lg pl-3 pr-12 py-2 text-xs text-muted-foreground truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qrCode);
                        toast.success('Código PIX copiado!');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                      title="Copiar código"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={handleSimulateApproval}
                      disabled={isProcessing}
                      className="w-full h-12 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-muted/80 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      Simular Aprovação (Sandbox)
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium animate-pulse">
                      <Loader2 size={14} className="animate-spin" />
                      Aguardando confirmação do pagamento...
                    </div>
                  </div>
                </motion.div>
              ) : creditCardUrl ? (
                <motion.div
                  key="credit-card-payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border shadow-2xl rounded-3xl p-8 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <CreditCard size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Ambiente Seguro</h3>
                  <p className="text-sm text-muted-foreground mb-6">Uma nova aba foi aberta com o link seguro de pagamento do Asaas. Se não abriu, clique no botão abaixo.</p>
                  
                  <a
                    href={creditCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 bg-primary/10 text-primary font-bold rounded-xl flex items-center justify-center gap-2 mb-4 hover:bg-primary/20 transition-colors"
                  >
                    Abrir aba de pagamento
                  </a>

                  <button
                    onClick={handleSimulateApproval}
                    disabled={isProcessing}
                    className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-primary/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Simular Pagamento Confirmado
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                key="checkout-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border shadow-2xl rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total a pagar</p>
                    <h2 className="text-4xl font-black text-foreground">R$ 7,00<span className="text-sm font-medium text-muted-foreground ml-1">/único</span></h2>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'pix' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <QrCode size={24} className="mb-2" />
                        <span className="text-sm font-bold">PIX</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'credit_card' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <CreditCard size={24} className="mb-2" />
                        <span className="text-sm font-bold">Cartão</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Lock size={18} />
                          Pagar R$ 7,00
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
                      <Shield size={14} />
                      Pagamento seguro (Ambiente de Teste)
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              key="success-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border shadow-2xl rounded-3xl p-10 text-center flex flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2">Pagamento Confirmado!</h3>
                <p className="text-muted-foreground">
                  A Inteligência Artificial foi liberada para o projeto <strong>{project.name}</strong>.
                </p>
                <div className="mt-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Redirecionando...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
