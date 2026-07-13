import { useOutletContext } from 'react-router-dom';
import type { Project } from '@/types/database';
import { AIPaywall } from '@/components/ai/AIPaywall';
import { AIUploader } from '@/components/ai/AIUploader';
import { AIProcessingModal } from '@/components/ai/AIProcessingModal';
import { AIPreviewBoard } from '@/components/ai/AIPreviewBoard';
import { useAIProcessor } from '@/hooks/ai/useAIProcessor';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

export default function ProjectAI() {
  const { project } = useOutletContext<{ project: Project | null }>();
  const { state, result, process, reset } = useAIProcessor(project?.id || '');

  const { user } = useAuth();
  const isOwner = project?.owner_id === user?.id;

  if (!project) return null;

  if (!isOwner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border shadow-sm">
          <Lock size={24} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md text-sm leading-relaxed">
          Apenas o proprietário do projeto tem permissão para acessar a Inteligência Artificial e consumir créditos gerando novos quadros.
        </p>
      </div>
    );
  }

  // Premium Validation
  if (project.is_free) {
    return <AIPaywall project={project} />;
  }

  // Se já temos resultado da IA, mostra a tela de revisão
  if (result && state.status === 'success') {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <AIPreviewBoard 
          board={result} 
          projectId={project.id} 
          onCancel={reset}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background relative custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent"
          >
            DevBan AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-2"
          >
            Gere tarefas e quadros automaticamente a partir de textos, documentos e imagens.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AIUploader onGenerate={process} />
        </motion.div>
      </div>
      
      {state.status !== 'idle' && (
        <AIProcessingModal state={state} onClose={reset} />
      )}
    </div>
  );
}
