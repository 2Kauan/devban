import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement for a relaxed, floating feel
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate position relative to the center of the screen
      const x = (e.clientX - window.innerWidth / 2) * 0.5; // multiplier controls how far it moves
      const y = (e.clientY - window.innerHeight / 2) * 0.5;
      
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Glow following mouse */}
      <motion.div 
        style={{ x: springX, y: springY }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" 
      />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Novo: Inteligência Artificial Integrada ✨
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.1] mb-6"
        >
          Organize ideias. Entregue resultados.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
        >
          O DevBan é um Kanban poderoso impulsionado por <b>Inteligência Artificial</b>. Transforme textos e imagens em tarefas automaticamente em uma plataforma premium e minimalista.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-20"
        >
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_40px_rgba(192,132,252,0.4)]"
          >
            Começar Gratuitamente
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#demo"
            className="flex items-center gap-2 px-8 py-4 bg-transparent border border-border text-foreground rounded-lg text-lg font-medium hover:bg-muted transition-all"
          >
            Assistir Demonstração
          </a>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-5xl rounded-2xl md:rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Mockup Header/Browser Bar */}
          <div className="h-12 border-b border-border/50 bg-muted/30 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="mx-auto w-1/3 h-6 bg-background rounded-md border border-border/50 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-mono">devban.app</span>
            </div>
          </div>
          
          {/* Mockup Body (Kanban Board UI) */}
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-background">
            {[
              { title: "A Fazer", count: 3, cards: ["Implementar Landing Page", "Revisar Design System"] },
              { title: "Fazendo", count: 1, cards: ["Otimizar Performance"] },
              { title: "Concluído", count: 5, cards: ["Configurar Supabase", "Criar Auth"] }
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{col.title}</h3>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{col.count}</span>
                </div>
                {col.cards.map((card, cardIdx) => (
                  <div key={cardIdx} className="p-4 rounded-xl border border-border/50 bg-card shadow-sm flex flex-col gap-3">
                    <div className="h-2 w-12 bg-primary/20 rounded-full" />
                    <p className="font-medium text-sm text-foreground">{card}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background" />
                        <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background" />
                      </div>
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
