import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncAllCardsToGoogleCalendar, syncSelectedCardsToGoogleCalendar, fetchCardsWithDueDate, subscribeToGoogleCalendarWebhook } from '@/services/google/calendar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { 
  Plug, 
  FolderKanban,
  RefreshCw,
  Settings2
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  category: 'calendar' | 'notification' | 'productivity' | 'google';
  description: string;
  iconBg: string;
  iconColor: string;
  brandSvg: React.ReactNode;
  isActive: boolean;
  statusText: string;
  configType: 'oauth' | 'ical' | 'webhook' | 'token';
  projectId: string;
}

export default function Integrations() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: projects = [] } = useProjectsQuery();
  
  // Persisted state in localStorage for demonstration and persistent settings
  const [integrationsState, setIntegrationsState] = useState<Record<string, { active: boolean; projectId?: string; config?: any }>>(() => {
    const saved = localStorage.getItem('devban_integrations');
    return saved ? JSON.parse(saved) : {
      google_calendar: { active: false, projectId: 'all', config: { email: '', syncMode: 'two-way' } }
    };
  });

  const [selectedModalApp, setSelectedModalApp] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'all' | 'selected'>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [availableCards, setAvailableCards] = useState<Array<{ id: string; title: string; due_date: string; is_completed: boolean; priority: string | null }>>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    // Detect if user logged in / connected via Google provider
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem('devban_gcal_token', session.provider_token);
        subscribeToGoogleCalendarWebhook();
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email) setUserEmail(user.email);
        const hasToken = !!localStorage.getItem('devban_gcal_token');
        if (hasToken) {
          setIntegrationsState(prev => ({
            ...prev,
            google_calendar: { 
              ...(prev.google_calendar || { projectId: 'all' }), 
              active: prev.google_calendar?.active ?? true, 
              config: { email: user.email || 'Conta Google', syncMode: 'two-way' } 
            }
          }));
        }
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('devban_integrations', JSON.stringify(integrationsState));
  }, [integrationsState]);

  const currentGCalProjectId = integrationsState.google_calendar?.projectId;

  useEffect(() => {
    if (selectedModalApp === 'google_calendar' && syncMode === 'selected') {
      setLoadingCards(true);
      fetchCardsWithDueDate(currentGCalProjectId).then(cards => {
        setAvailableCards(cards);
        setLoadingCards(false);
      });
    }
  }, [selectedModalApp, syncMode, currentGCalProjectId]);

  const toggleIntegration = async (id: string) => {
    const current = integrationsState[id] || { active: false };
    const nextActive = !current.active;

    const googleIds = ['google_calendar'];
    if (nextActive && googleIds.includes(id)) {
      setConnectingId(id);
      await new Promise(r => setTimeout(r, 600));
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent select_account'
            },
            redirectTo: `${window.location.origin}/integrations`
          }
        });
        if (error) throw error;
      } catch (err: any) {
        toast.error('Erro ao conectar com Google: ' + err.message);
        setConnectingId(null);
        return;
      }
    }

    if (!nextActive && googleIds.includes(id)) {
      localStorage.removeItem('devban_gcal_token');
    }

    setIntegrationsState(prev => {
      toast.success(nextActive ? `Integração ativada!` : `Integração desativada.`);
      return { ...prev, [id]: { ...current, active: nextActive } };
    });
    setConnectingId(null);
  };

  const handleUpdateProjectBinding = (appId: string, projectId: string) => {
    setIntegrationsState(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || { active: true }), projectId }
    }));
    const projName = projectId === 'all' ? 'Todos os Projetos' : projects.find(p => p.id === projectId)?.name || 'Projeto';
    toast.success(`Integração vinculada a: ${projName}`);
  };

  const list: Integration[] = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      category: 'google',
      description: 'Sincronize prazos de tarefas do Devban na sua agenda.',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
      brandSvg: (
        <div className="w-full h-full overflow-hidden">
          <img src="/google-calendar--v1.webp" alt="Google Calendar" className="w-full h-full object-cover" />
        </div>
      ),
      isActive: !!integrationsState.google_calendar?.active,
      statusText: integrationsState.google_calendar?.active ? 'Conectado' : 'Desconectado',
      configType: 'oauth',
      projectId: integrationsState.google_calendar?.projectId || 'all'
    }
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onProjectCreated={() => {}} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        <TopHeader title="Central de Integrações" onOpenSidebar={() => setIsSidebarOpen(true)} />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Plug className="text-primary" size={28} />
                Central de Integrações
              </h1>
              <p className="text-muted-foreground mt-1">
                Conecte o Devban aos seus apps favoritos para otimizar seu fluxo de trabalho.
              </p>
            </div>
          </div>

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {list.map(app => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${app.iconBg} ${app.iconColor}`}>
                      {app.brandSvg}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{app.name}</h3>
                      <p className="text-xs text-muted-foreground">{app.isActive ? 'Ativo' : 'Desconectado'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                  {app.isActive && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                      <FolderKanban size={14} />
                      {integrationsState[app.id]?.projectId === 'all' 
                        ? 'Todos os Projetos' 
                        : projects.find(p => p.id === integrationsState[app.id]?.projectId)?.name || 'Projeto'}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleIntegration(app.id)}
                      disabled={connectingId === app.id}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        app.isActive 
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {connectingId === app.id ? <RefreshCw className="animate-spin mx-auto" size={16} /> : app.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    {app.isActive && (
                      <button
                        onClick={() => setSelectedModalApp(app.id)}
                        className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
                      >
                        <Settings2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {selectedModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalApp(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 z-50 space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground capitalize">
                    Configurar {selectedModalApp.replace('_', ' ')}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedModalApp(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FolderKanban size={14} className="text-primary" />
                  Vincular a qual projeto?
                </label>
                <select
                  value={integrationsState[selectedModalApp]?.projectId || 'all'}
                  onChange={e => handleUpdateProjectBinding(selectedModalApp, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Todos os Meus Projetos (Global)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto overflow-hidden">
                  <img src="/google-calendar--v1.webp" alt="Google Calendar" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground">Conta Google Vinculada</h3>
                  <p className="text-xs text-muted-foreground">{userEmail || integrationsState.google_calendar?.config?.email || 'Conta Google Conectada'}</p>
                </div>

                <div className="p-4 bg-muted/30 border border-border rounded-2xl text-left space-y-3">
                  <label className="block text-xs font-bold text-foreground">O que deseja sincronizar?</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSyncMode('all'); setSelectedCardIds([]); }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        syncMode === 'all'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      Todos os cartões
                    </button>
                    <button
                      onClick={() => setSyncMode('selected')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        syncMode === 'selected'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      Só os selecionados
                    </button>
                  </div>

                  {syncMode === 'selected' && (
                    <div className="space-y-2 pt-2">
                      {loadingCards ? (
                        <p className="text-xs text-muted-foreground text-center py-3">Carregando cartões...</p>
                      ) : availableCards.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">Nenhum cartão com data encontrado.</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setSelectedCardIds(availableCards.map(c => c.id))}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              Selecionar Todos
                            </button>
                            <button
                              onClick={() => setSelectedCardIds([])}
                              className="text-[10px] font-bold text-muted-foreground hover:underline cursor-pointer"
                            >
                              Limpar
                            </button>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1.5">
                            {availableCards.map(card => (
                              <label
                                key={card.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-left ${
                                  selectedCardIds.includes(card.id)
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-border bg-background hover:border-primary/20'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCardIds.includes(card.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCardIds(prev => [...prev, card.id]);
                                    } else {
                                      setSelectedCardIds(prev => prev.filter(id => id !== card.id));
                                    }
                                  }}
                                  className="rounded accent-primary shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-foreground truncate">{card.title}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {new Date(card.due_date).toLocaleDateString('pt-BR')}
                                    {card.is_completed ? ' · Concluído' : ''}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (syncMode === 'all') {
                      await syncAllCardsToGoogleCalendar();
                    } else {
                      await syncSelectedCardsToGoogleCalendar(selectedCardIds);
                    }
                    setSelectedModalApp(null);
                  }}
                  disabled={syncMode === 'selected' && selectedCardIds.length === 0}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    syncMode === 'selected' && selectedCardIds.length === 0
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <RefreshCw size={16} />
                  Sincronizar Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
