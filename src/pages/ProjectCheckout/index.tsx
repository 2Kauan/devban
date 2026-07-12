import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { ArrowLeft, CheckCircle2, Shield, CreditCard, QrCode, Lock, Loader2, Sparkles } from 'lucide-react';
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
  }, [id, navigate]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    
    // Simula o tempo de processamento de um gateway de pagamento (ex: Stripe/Asaas)
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      if (!project) return;
      
      const { error } = await supabase
        .from('projects')
        .update({ is_free: false })
        .eq('id', project.id);

      if (error) throw error;

      setIsSuccess(true);
      
      // Aguarda a animação de sucesso antes de redirecionar
      setTimeout(() => {
        toast.success('Pagamento aprovado! Inteligência Artificial liberada.');
        navigate(`/project/${project.id}/ai`);
      }, 2500);

    } catch (error: any) {
      toast.error('Falha ao processar pagamento: ' + error.message);
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
                    <h2 className="text-4xl font-black text-foreground">R$ 5,00<span className="text-sm font-medium text-muted-foreground ml-1">/único</span></h2>
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
                      onClick={handleSimulatePayment}
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
                          Pagar R$ 5,00
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
