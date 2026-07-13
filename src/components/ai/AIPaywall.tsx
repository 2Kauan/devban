import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Image, FileText, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '@/types/database';

interface AIPaywallProps {
  project: Project;
}

export function AIPaywall({ project }: AIPaywallProps) {

  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate(`/project/${project.id}/checkout`);
  };

  const features = [
    { icon: FileText, text: 'Importação mágica de Documentos e PDFs' },
    { icon: Image, text: 'OCR Avançado: Leia imagens e quadros brancos' },
    { icon: Zap, text: 'Geração inteligente de Cards, Categorias e Checklists' },
    { icon: Sparkles, text: 'Modelos adaptativos (Planejamento, Sprint, Resumo)' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-background/50 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 overflow-hidden"
      >
        {/* Premium Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
          <Lock size={12} />
          RECURSO PREMIUM
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Destrave o poder da <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Inteligência Artificial</span>.
        </h2>
        
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          O <strong>DevBan AI</strong> analisa seus documentos, anotações e imagens, transformando tudo em quadros Kanban organizados em segundos.
        </p>

        <div className="space-y-4 mb-10">
          {features.map((feat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="flex items-center gap-4 text-foreground/80 font-medium"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <feat.icon size={16} className="text-primary" />
              </div>
              {feat.text}
            </motion.div>
          ))}
        </div>

        <button 
          onClick={handleUpgrade}
          className="w-full relative group overflow-hidden rounded-xl bg-primary text-primary-foreground p-4 font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          Tornar este Projeto Premium
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Upgrade aplicável apenas a este projeto ({project.name}).
        </p>
      </motion.div>
    </div>
  );
}
