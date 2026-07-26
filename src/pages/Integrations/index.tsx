import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncAllCardsToGoogleCalendar, syncSelectedCardsToGoogleCalendar, fetchCardsWithDueDate, subscribeToGoogleCalendarWebhook } from '@/services/google/calendar';
import { syncAllCardsToGoogleTasks, syncSelectedCardsToGoogleTasks } from '@/services/google/tasks';
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
import { isNative } from '@/lib/capacitor';

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
  isComingSoon?: boolean;
}

export default function Integrations() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: projects = [] } = useProjectsQuery();
  
  const [integrationsState, setIntegrationsState] = useState<Record<string, { active: boolean; projectId?: string; config?: any }>>(() => {
    const saved = localStorage.getItem('devban_integrations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      google_calendar: { active: false, projectId: 'all' },
      google_tasks: { active: false, projectId: 'all' }
    };
  });

  const [selectedModalApp, setSelectedModalApp] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const [syncMode, setSyncMode] = useState<'all' | 'selected'>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [availableCards, setAvailableCards] = useState<Array<{ id: string; title: string; due_date: string; is_completed: boolean; priority: string | null }>>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem('devban_gcal_token', session.provider_token);
        const providerRefreshToken = (session as any).provider_refresh_token || undefined;
        subscribeToGoogleCalendarWebhook(providerRefreshToken);
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

  const currentAppProjectId = selectedModalApp ? (integrationsState[selectedModalApp]?.projectId || 'all') : 'all';

  useEffect(() => {
    if (selectedModalApp) {
      setLoadingCards(true);
      fetchCardsWithDueDate(currentAppProjectId).then(cards => {
        setAvailableCards(cards);
        setLoadingCards(false);
      });
    }
  }, [selectedModalApp, currentAppProjectId]);

  const toggleIntegration = async (id: string) => {
    const current = integrationsState[id] || { active: false };
    const nextActive = !current.active;

    const googleIds = ['google_calendar'];
    if (nextActive && googleIds.includes(id)) {
      setConnectingId(id);
      await new Promise(r => setTimeout(r, 600));
      try {
        const redirectTo = isNative
          ? 'com.flowkanban.app://integrations'
          : `${window.location.origin}/integrations`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent select_account'
            },
            redirectTo
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

  const forceReauthorize = async () => {
    setConnectingId('google_calendar');
    try {
      const redirectTo = isNative
        ? 'com.flowkanban.app://integrations'
        : `${window.location.origin}/integrations`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account'
          },
          redirectTo
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('Erro ao reautorizar: ' + err.message);
      setConnectingId(null);
    }
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
      description: 'Sincronize prazos e cartões do Devban no seu Google Calendar.',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
      brandSvg: (
        <div className="w-full h-full overflow-hidden p-0.5 flex items-center justify-center">
          <img src="/google-calendar--v1.webp" alt="Google Calendar" className="w-full h-full object-contain" />
        </div>
      ),
      isActive: !!integrationsState.google_calendar?.active,
      statusText: integrationsState.google_calendar?.active ? 'Conectado' : 'Desconectado',
      configType: 'oauth',
      projectId: integrationsState.google_calendar?.projectId || 'all'
    },
    {
      id: 'google_tasks',
      name: 'Google Tasks',
      category: 'google',
      description: 'Sincronize prazos e cartões do Devban no seu Google Tasks.',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
      brandSvg: (
        <div className="w-full h-full overflow-hidden p-0.5 flex items-center justify-center">
          <img src="/Google_Tasks_2021.svg.webp" alt="Google Tasks" className="w-full h-full object-contain" />
        </div>
      ),
      isActive: false,
      statusText: 'Em breve',
      configType: 'oauth',
      projectId: 'all',
      isComingSoon: true
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

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            <AnimatePresence mode="popLayout">
              {list.map(app => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`relative bg-card border border-border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 h-full ${
                    app.isComingSoon ? 'opacity-50 grayscale-[50%]' : 'hover:shadow-md'
                  }`}
                >
                  <div>
                    {app.isComingSoon && (
                      <span className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        Em breve
                      </span>
                    )}
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${app.iconBg} ${app.iconColor}`}>
                        {app.brandSvg}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{app.name}</h3>
                        <p className="text-xs text-muted-foreground">{app.isComingSoon ? 'Em breve' : app.isActive ? 'Ativo' : 'Desconectado'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 min-h-[40px] leading-snug">{app.description}</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="min-h-[20px] flex items-center">
                      {app.isActive && !app.isComingSoon && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                          <FolderKanban size={14} />
                          {integrationsState[app.id]?.projectId === 'all' 
                            ? 'Todos os Projetos' 
                            : projects.find(p => p.id === integrationsState[app.id]?.projectId)?.name || 'Projeto'}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {app.isComingSoon ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-lg text-xs font-bold bg-muted/60 text-muted-foreground border border-border cursor-not-allowed"
                        >
                          Em Breve
                        </button>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
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
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto overflow-hidden p-2">
                  {list.find(a => a.id === selectedModalApp)?.brandSvg}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground">Conta Google Vinculada</h3>
                  <p className="text-xs text-muted-foreground">{userEmail || integrationsState[selectedModalApp]?.config?.email || 'Conta Google Conectada'}</p>
                </div>

                {/* Manual de Bypass de Tela de Segurança do Google */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left space-y-2">
                  <div className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                    ⚠️ Passo a Passo de Liberação (Segurança Google)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Como o aplicativo está em fase de homologação no Google, ao conectar você verá uma tela vermelha de aviso. Para liberar o acesso do Supabase/Devban:
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                    <li>Na tela de aviso, clique no link <strong>"Configurações Avançadas"</strong> (ou "Advanced" / "Mostrar Avançado").</li>
                    <li>Clique no link inferior escrito <strong>"Acessar irboqakduscfjtknhokg.supabase.co (não seguro)"</strong> (ou "Go to...").</li>
                    <li>Conceda a permissão e continue normalmente.</li>
                  </ol>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={forceReauthorize}
                    disabled={connectingId === 'google_calendar'}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    {connectingId === 'google_calendar' ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </button>
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
                    if (selectedModalApp === 'google_tasks') {
                      if (syncMode === 'all') {
                        await syncAllCardsToGoogleTasks();
                      } else {
                        await syncSelectedCardsToGoogleTasks(selectedCardIds);
                      }
                    } else {
                      if (syncMode === 'all') {
                        await syncAllCardsToGoogleCalendar();
                      } else {
                        await syncSelectedCardsToGoogleCalendar(selectedCardIds);
                      }
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
