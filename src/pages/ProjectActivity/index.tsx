import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, createUniqueChannel } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { Activity, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  old_value: any;
  new_value: any;
  profiles: {
    name: string;
    avatar_url: string;
  };
  cards: {
    title: string;
  };
}

export default function ProjectActivity() {
  const { project } = useOutletContext<{ project: Project }>();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (project?.id) {
      fetchActivity();
      
      const subscription = createUniqueChannel(`activity_${project.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'card_activity_logs',
          filter: `project_id=eq.${project.id}`
        }, () => {
          fetchActivity();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [project?.id]);

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_activity_logs')
        .select(`
          id, action, created_at, old_value, new_value,
          profiles (name, avatar_url),
          cards (title)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const formattedData = (data || []).map((log: any) => ({
        ...log,
        profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles,
        cards: Array.isArray(log.cards) ? log.cards[0] : log.cards
      }));
      
      setLogs(formattedData);
    } catch (error: any) {
      toast.error('Erro ao carregar atividades: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionText = (log: ActivityLog) => {
    // Se o cartão foi excluído e está nulo, pegamos o nome salvo em old_value
    const oldTitle = (log.old_value as any)?.title;
    const cardTitle = log.cards?.title || oldTitle || 'tarefa desconhecida';
    
    switch (log.action) {
      case 'created':
      case 'created_card':
        return `criou a tarefa "${cardTitle}"`;
      case 'updated_status':
      case 'moved_card':
        const fromCol = (log.old_value as any)?.column_title;
        const toCol = (log.new_value as any)?.column_title;
        if (fromCol && toCol) {
          return `moveu a tarefa "${cardTitle}" de "${fromCol}" para "${toCol}"`;
        }
        return `moveu a tarefa "${cardTitle}" para "${(log.new_value as any)?.column_title || 'outra coluna'}"`;
      case 'updated_description': 
        return `atualizou a descrição da tarefa "${cardTitle}"`;
      case 'added_comment': 
        return `comentou na tarefa "${cardTitle}"`;
      case 'added_attachment': 
        return `anexou um arquivo em "${cardTitle}"`;
      case 'deleted': 
        return `excluiu a tarefa "${cardTitle}"`;
      default: 
        return `atualizou a tarefa "${cardTitle}"`;
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Activity className="text-primary" size={28} />
          Atividades do Projeto
        </h1>
        <p className="text-muted-foreground mt-2">
          Histórico das últimas 50 ações realizadas neste projeto.
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            Carregando histórico...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <History size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Sem atividades</h3>
            <p className="text-muted-foreground max-w-sm">Nenhuma atividade registrada neste projeto ainda.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-border/60 ml-4 space-y-8 pb-4">
            {logs.map((log, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={log.id} 
                className="relative pl-8"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 mt-0.5">
                    {log.profiles?.avatar_url ? (
                      <img src={log.profiles.avatar_url} alt={log.profiles?.name} className="w-full h-full object-cover" />
                    ) : (
                      log.profiles?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{log.profiles?.name || 'Usuário'}</span>{' '}
                      <span className="text-muted-foreground">{getActionText(log)}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
