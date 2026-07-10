import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-32 px-4 relative overflow-hidden bg-background">
      {/* Background radial glow specific for CTA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container relative z-10 mx-auto text-center max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-muted/30 border border-border/50 rounded-[3rem] p-12 md:p-16 shadow-2xl backdrop-blur-sm"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-foreground tracking-tight">Pronto para elevar o nível da sua equipe?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Junte-se a milhares de profissionais que já abandonaram as ferramentas antigas. Comece agora, sem custo.
          </p>
          <Link 
            to="/register" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-foreground text-background rounded-xl text-lg font-bold hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95 shadow-2xl"
          >
            Criar meu Projeto Gratuitamente
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Sem cartão de crédito. Setup em 30 segundos.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
