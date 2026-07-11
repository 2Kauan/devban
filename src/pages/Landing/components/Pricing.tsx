import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 bg-muted/20 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Simples. Transparente. Justo.
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece de graça e pague apenas pelo que realmente precisar usar, sem assinaturas mensais abusivas.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-3xl bg-background border border-border/50 shadow-sm flex flex-col relative overflow-hidden"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Plano Inicial</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-extrabold text-foreground">Grátis</span>
                <span className="text-muted-foreground font-medium">para sempre</span>
              </div>
              <p className="text-muted-foreground">Ideal para testar o DevBan e começar a organizar suas ideias agora mesmo.</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground font-medium">1 Projeto Completo Gratuito</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-muted-foreground">Membros de Equipe Ilimitados</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-muted-foreground">Cards e Tarefas Ilimitados</span>
              </li>
            </ul>

            <Link
              to="/register"
              className="w-full py-4 rounded-xl font-bold bg-muted text-foreground border border-border/50 hover:bg-muted/80 transition-colors text-center"
            >
              Criar Conta Grátis
            </Link>
          </motion.div>

          {/* Paid Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 rounded-3xl bg-background border-2 border-primary shadow-[0_0_30px_rgba(192,132,252,0.15)] flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
              Mais Popular
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Plano Expansão</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-lg text-muted-foreground font-bold">R$</span>
                <span className="text-4xl font-extrabold text-foreground">5,00</span>
                <span className="text-muted-foreground font-medium">/ projeto extra</span>
              </div>
              <p className="text-muted-foreground">Cresceu? Compre projetos adicionais pontualmente, sem assinatura.</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground font-medium">Tudo do Plano Inicial</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Projetos Extras Sob Demanda</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">Pagamento Único (PIX ou Cartão)</span>
              </li>
            </ul>

            <Link
              to="/register"
              className="w-full py-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              Começar Gratuitamente
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Não é assinatura. Pagamento apenas quando precisar.</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
