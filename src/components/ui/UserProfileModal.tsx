import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, BarChart2, LayoutDashboard, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { KanbanCardType } from '@/types/kanban';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId?: string;
  cards?: KanbanCardType[];
}

interface UserProfileData {
  name: string;
  email: string;
  avatar_url: string;
  permission: string;
  job_title: string;
  cardsCreated: number;
  cardsAssigned: number;
  activityData: { date: string; count: number }[];
}

export function UserProfileModal({ isOpen, onClose, userId, projectId, cards = [] }: UserProfileModalProps) {
  const [data, setData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchData();
    }
  }, [isOpen, userId, projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile
      const { data: profileRes } = await supabase.from('profiles').select('name, email, avatar_url').eq('id', userId).single();
      const profile = profileRes || { name: 'Desconhecido', email: '', avatar_url: '' };

      let member = { permission: 'viewer', job_title: '' };
      
      if (projectId) {
        const { data: memberRes } = await supabase.from('project_members').select('permission, job_title').eq('project_id', projectId).eq('user_id', userId).single();
        if (memberRes) member = memberRes;
      }

      let cardsCreated = 0;
      let cardsAssigned = 0;

      if (projectId) {
        cardsCreated = (cards || []).filter(c => c.created_by === userId).length;
        cardsAssigned = (cards || []).filter(c => c.assignees?.some(a => a.id === userId)).length;
      } else {
        // Busca os totais globais no banco
        const [{ count: cCount }, { count: aCount }] = await Promise.all([
          supabase.from('cards').select('*', { count: 'exact', head: true }).eq('created_by', userId),
          supabase.from('card_assignees').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        ]);
        cardsCreated = cCount || 0;
        cardsAssigned = aCount || 0;
      }

      // Process logs into daily counts
      const dailyCounts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyCounts[dateStr] = 0;
      }

      const sevenDaysAgo = subDays(new Date(), 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      let query = supabase
        .from('card_activity_logs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: logs } = await query;

      if (logs) {
        logs.forEach(log => {
          const dateStr = format(parseISO(log.created_at), 'yyyy-MM-dd');
          if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++;
          }
        });
      }

      const activityData = Object.keys(dailyCounts).map(date => ({
        date,
        count: dailyCounts[date]
      }));

      setData({
        name: profile.name || 'Sem nome',
        email: profile.email,
        avatar_url: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=random`,
        permission: member.permission,
        job_title: member.job_title || 'Membro da Equipe',
        cardsCreated,
        cardsAssigned,
        activityData
      });

    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionLabel = (perm: string) => {
    const labels: Record<string, string> = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'editor': 'Editor',
      'viewer': 'Leitor',
      'client': 'Cliente'
    };
    return labels[perm] || perm;
  };

  // Find max value for chart scaling
  const maxActivity = data ? Math.max(...data.activityData.map(d => d.count), 1) : 1;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card rounded-2xl shadow-2xl z-[110] overflow-hidden border border-border"
          >
            {/* Header / Banner */}
            <div className="h-24 bg-gradient-to-r from-primary/80 to-primary w-full relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors z-10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 pt-0 relative">
              {isLoading || !data ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : (
                <>
                  {/* Avatar and Basic Info */}
                  <div className="flex flex-col items-center -mt-12 mb-6">
                    <img 
                      src={data.avatar_url} 
                      alt={data.name} 
                      className="w-24 h-24 rounded-full border-4 border-card shadow-lg object-cover bg-muted"
                    />
                    <h2 className="text-xl font-bold text-foreground mt-3 text-center">{data.name}</h2>
                    <p className="text-sm text-primary font-medium">{data.job_title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                        {getPermissionLabel(data.permission)}
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <LayoutDashboard className="text-primary/70 mb-2" size={20} />
                      <span className="text-2xl font-bold text-foreground">{data.cardsCreated}</span>
                      <span className="text-xs text-muted-foreground mt-1">Cartões Criados</span>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <CheckSquare className="text-primary/70 mb-2" size={20} />
                      <span className="text-2xl font-bold text-foreground">{data.cardsAssigned}</span>
                      <span className="text-xs text-muted-foreground mt-1">Tarefas Atribuídas</span>
                    </div>
                  </div>

                  {/* Activity Chart */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 size={16} className="text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground">Atividade nos Últimos 7 Dias</h3>
                    </div>
                    
                    <div className="flex items-end justify-between h-32 gap-2 bg-muted/10 border border-border/50 rounded-xl p-4">
                      {data.activityData.map((day, idx) => {
                        const heightPercent = Math.max((day.count / maxActivity) * 100, 4); // min height 4%
                        const dateObj = parseISO(day.date);
                        
                        return (
                          <div key={day.date} className="flex flex-col items-center flex-1 gap-2 group">
                            <div className="relative w-full flex justify-center h-full items-end">
                              {/* Tooltip */}
                              <div className="absolute -top-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {day.count} {day.count === 1 ? 'ação' : 'ações'}
                              </div>
                              {/* Bar */}
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercent}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                className="w-full max-w-[24px] bg-primary/60 hover:bg-primary rounded-t-sm transition-colors cursor-pointer"
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                              {format(dateObj, 'eee', { locale: ptBR }).substring(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
