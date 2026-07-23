import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncAllCardsToGoogleCalendar, syncSelectedCardsToGoogleCalendar, fetchCardsWithDueDate } from '@/services/googleCalendarService';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { 
  Plug, 
  Calendar as CalendarIcon, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  Settings2, 
  RefreshCw,
  BellRing,
  FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  category: 'calendar' | 'notification' | 'productivity';
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'calendar' | 'notification' | 'productivity'>('all');
  const { data: projects = [] } = useProjectsQuery();
  
  // Persisted state in localStorage for demonstration and persistent settings
  const [integrationsState, setIntegrationsState] = useState<Record<string, { active: boolean; projectId?: string; config?: any }>>(() => {
    const saved = localStorage.getItem('devban_integrations');
    return saved ? JSON.parse(saved) : {
      google_calendar: { active: false, projectId: 'all', config: { email: '', syncMode: 'two-way' } },
      ical_feed: { active: false, projectId: 'all' },
      discord: { active: false, projectId: 'all', config: { webhookUrl: '' } },
      slack: { active: false, projectId: 'all', config: { webhookUrl: '' } },
      notion: { active: false, projectId: 'all', config: { token: '' } },
      github: { active: false, projectId: 'all', config: { repo: '' } },
      custom_webhook: { active: false, projectId: 'all', config: { url: '' } }
    };
  });

  const [selectedModalApp, setSelectedModalApp] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [notionTokenInput, setNotionTokenInput] = useState('');
  const [syncMode, setSyncMode] = useState<'all' | 'selected'>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [availableCards, setAvailableCards] = useState<Array<{ id: string; title: string; due_date: string; is_completed: boolean; priority: string | null }>>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Detect if user logged in / connected via Google provider
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem('devban_gcal_token', session.provider_token);
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
              active: true, 
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

    if (nextActive && id === 'google_calendar') {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
            redirectTo: `${window.location.origin}/integrations`
          }
        });
        if (error) throw error;
      } catch (err: any) {
        toast.error('Erro ao conectar com Google: ' + err.message);
        return;
      }
    }

    if (!nextActive && id === 'google_calendar') {
      localStorage.removeItem('devban_gcal_token');
    }

    if (nextActive && id === 'github') {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            scopes: 'repo read:user',
            redirectTo: `${window.location.origin}/integrations`
          }
        });
        if (error) throw error;
      } catch (err: any) {
        toast.error('Erro ao conectar com GitHub: ' + err.message);
        return;
      }
    }

    setIntegrationsState(prev => {
      toast.success(nextActive ? `Integração ativada!` : `Integração desativada.`);
      return { ...prev, [id]: { ...current, active: nextActive } };
    });
  };

  const handleCopyICalUrl = () => {
    const feedUrl = `https://devban.app/api/v1/calendar/feed/${Math.random().toString(36).substring(2, 10)}.ics`;
    navigator.clipboard.writeText(feedUrl);
    setCopiedLink(true);
    toast.success('Link do feed iCal copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleUpdateProjectBinding = (appId: string, projectId: string) => {
    setIntegrationsState(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || { active: true }), projectId }
    }));
    const projName = projectId === 'all' ? 'Todos os Projetos' : projects.find(p => p.id === projectId)?.name || 'Projeto';
    toast.success(`Integração vinculada a: ${projName}`);
  };

  const handleSaveWebhook = (appId: string) => {
    if (!webhookUrlInput.startsWith('http')) {
      toast.error('Por favor, insira uma URL de Webhook válida.');
      return;
    }
    setIntegrationsState(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || { projectId: 'all' }), active: true, config: { webhookUrl: webhookUrlInput } }
    }));
    toast.success('Webhook salvo e integração ativada!');
    setSelectedModalApp(null);
  };

  const list: Integration[] = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      category: 'calendar',
      description: 'Sincronize automaticamente os prazos de tarefas do Devban diretamente na sua agenda do Google em tempo real.',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
      brandSvg: (
        <img src="/google-calendar--v1.webp" alt="Google Calendar" className="w-full h-full object-cover rounded-xl" />
      ),
      isActive: !!integrationsState.google_calendar?.active,
      statusText: integrationsState.google_calendar?.active ? 'Conectado (usuario@gmail.com)' : 'Desconectado',
      configType: 'oauth',
      projectId: integrationsState.google_calendar?.projectId || 'all'
    },
    {
      id: 'ical_feed',
      name: 'Apple / Outlook Calendar (iCal)',
      category: 'calendar',
      description: 'Link de assinatura universal de calendário (.ics) para sincronizar tarefas no iPhone, iPad, Mac e Outlook.',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-500',
      brandSvg: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#FF3B30"/>
          <path d="M3 8.5H21V17C21 19.2091 19.2091 21 17 21H7C4.79086 21 3 19.2091 3 17V8.5Z" fill="#FFFFFF"/>
          <text x="12" y="17.5" textAnchor="middle" fill="#1C1C1E" fontSize="9" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">31</text>
          <circle cx="8" cy="5.8" r="1.2" fill="#FFFFFF"/>
          <circle cx="16" cy="5.8" r="1.2" fill="#FFFFFF"/>
        </svg>
      ),
      isActive: !!integrationsState.ical_feed?.active,
      statusText: integrationsState.ical_feed?.active ? 'Feed Ativo' : 'Desativado',
      configType: 'ical',
      projectId: integrationsState.ical_feed?.projectId || 'all'
    },
    {
      id: 'discord',
      name: 'Discord Webhooks',
      category: 'notification',
      description: 'Receba alertas instantâneos no canal do Discord da sua equipe quando tarefas forem concluídas ou entrarem em atraso.',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      iconColor: 'text-indigo-500',
      brandSvg: (
        <img src="/discord-logo-discord-icon-transparent-free-png.webp" alt="Discord" className="w-full h-full object-cover rounded-xl" />
      ),
      isActive: !!integrationsState.discord?.active,
      statusText: integrationsState.discord?.active ? 'Canal Conectado' : 'Não configurado',
      configType: 'webhook',
      projectId: integrationsState.discord?.projectId || 'all'
    },
    {
      id: 'notion',
      name: 'Notion Database Sync',
      category: 'productivity',
      description: 'Sincronize colunas e cartões do Devban com bancos de dados do Notion de forma automática.',
      iconBg: 'bg-neutral-500/10 border-neutral-500/20',
      iconColor: 'text-foreground',
      brandSvg: (
        <img src="/free-notion-icon-svg-download-png-1911999.webp" alt="Notion" className="w-full h-full object-cover rounded-xl" />
      ),
      isActive: !!integrationsState.notion?.active,
      statusText: integrationsState.notion?.active ? 'Database Vinculada' : 'Não vinculado',
      configType: 'token',
      projectId: integrationsState.notion?.projectId || 'all'
    },
    {
      id: 'github',
      name: 'GitHub Webhooks',
      category: 'productivity',
      description: 'Mova cartões para "Concluído" automaticamente quando Pull Requests forem fechados no repositório.',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      iconColor: 'text-purple-500',
      brandSvg: (
        <svg className="w-10 h-10 text-foreground dark:text-white" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      ),
      isActive: !!integrationsState.github?.active,
      statusText: integrationsState.github?.active ? 'Repositório Vinculado' : 'Não configurado',
      configType: 'webhook',
      projectId: integrationsState.github?.projectId || 'all'
    }
  ];

  const filtered = list.filter(i => activeCategory === 'all' || i.category === activeCategory);

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
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6 sm:p-8 shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} />
                Hub de Conexões
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Conecte o Devban aos seus apps favoritos
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Mantenha suas tarefas, prazos e equipe em sintonia sincronizando automaticamente com Google Calendar, Discord, Notion e muito mais sem custo adicional.
              </p>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 hidden md:block">
              <Plug size={180} className="text-primary" />
            </div>
          </div>

          {/* Categorias Filtro */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Todas ({list.length})
            </button>
            <button
              onClick={() => setActiveCategory('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'calendar' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CalendarIcon size={16} />
              Calendários
            </button>
            <button
              onClick={() => setActiveCategory('notification')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'notification' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <BellRing size={16} />
              Notificações
            </button>
            <button
              onClick={() => setActiveCategory('productivity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'productivity' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <FileText size={16} />
              Produtividade & Dev
            </button>
          </div>

          {/* Grid de Integrações */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(app => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-4">
                    <div className={`w-14 h-14 rounded-2xl border ${app.iconBg} flex items-center justify-center shrink-0 overflow-hidden shadow-xs p-1`}>
                      {app.brandSvg}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        app.id === 'google_calendar' && app.isActive && !localStorage.getItem('devban_gcal_token')
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : app.isActive 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-muted text-muted-foreground border border-border/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          app.id === 'google_calendar' && app.isActive && !localStorage.getItem('devban_gcal_token')
                            ? 'bg-amber-500 animate-pulse'
                            : app.isActive 
                            ? 'bg-emerald-500 animate-pulse' 
                            : 'bg-muted-foreground'
                        }`} />
                        {app.id === 'google_calendar' && app.isActive && !localStorage.getItem('devban_gcal_token')
                          ? 'Reconexão necessária'
                          : app.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* Nome e Descrição */}
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 min-h-[44px]">
                      {app.description}
                    </p>

                    {/* Badge do Projeto Vinculado */}
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 border border-border/40 px-2.5 py-1 rounded-lg w-fit">
                      <FolderKanban size={12} className="text-primary" />
                      <span className="truncate max-w-[180px]">
                        {app.projectId === 'all' 
                          ? 'Todos os Projetos' 
                          : projects.find(p => p.id === app.projectId)?.name || 'Projeto Selecionado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Card */}
                <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedModalApp(app.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Settings2 size={14} />
                    Configurar
                  </button>

                  <div className="flex items-center gap-2">
                    {app.id === 'google_calendar' && app.isActive && !localStorage.getItem('devban_gcal_token') ? (
                      <>
                        <button
                          onClick={() => toggleIntegration('google_calendar')}
                          className="px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Desconectar
                        </button>
                        <button
                          onClick={() => {
                            // Re-trigger OAuth flow
                            localStorage.setItem('devban_gcal_token_reauth', 'true');
                            toggleIntegration('google_calendar');
                          }}
                          className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Reautorizar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleIntegration(app.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          app.isActive
                            ? 'bg-muted hover:bg-destructive/10 hover:text-destructive text-foreground border border-border'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {app.isActive ? 'Desconectar' : 'Conectar'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </main>
      </div>

      {/* Modal de Configuração de Integração */}
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
              {/* Header Modal */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground capitalize">
                    Configurar {selectedModalApp.replace('_', ' ')}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defina as preferências de sincronização e o projeto vinculado.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedModalApp(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Seleção de Projeto Vinculado */}
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

              {/* Conteúdo Dinâmico por Tipo de App */}
              {selectedModalApp === 'ical_feed' ? (
                <div className="space-y-4">
                  {/* Passo a Passo de Conexão */}
                  <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-2 text-left">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" />
                      Como adicionar o Calendário no seu dispositivo:
                    </h4>
                    <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                      <li>No <strong>iPhone / iPad</strong>: Vá em <em>Ajustes ➔ Calendário ➔ Contas ➔ Adicionar Conta ➔ Outra ➔ Adicionar Calendário Assinado</em> e cole o link abaixo.</li>
                      <li>No <strong>Google Agenda</strong>: Clique no botão <strong>+</strong> ao lado de "Outros agendas" ➔ <em>Do URL</em> e cole a URL.</li>
                      <li>No <strong>Mac / Outlook</strong>: Vá em <em>Arquivo ➔ Nova Assinatura de Calendário</em>.</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Seu Link de Assinatura iCal exclusivo (.ics)
                    </label>
                    <div className="flex items-center gap-2 bg-background p-2.5 rounded-xl border border-border">
                      <input
                        type="text"
                        readOnly
                        value="https://devban.app/api/v1/calendar/feed/usr_849204.ics"
                        className="bg-transparent text-xs font-mono text-foreground flex-1 outline-none"
                      />
                      <button
                        onClick={handleCopyICalUrl}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLink ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-bold text-foreground">Preferências do Feed:</label>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                        <span>Sincronizar apenas cartões não concluídos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                        <span>Incluir checklists e responsáveis nos detalhes do evento</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : selectedModalApp === 'discord' || selectedModalApp === 'slack' || selectedModalApp === 'custom_webhook' || selectedModalApp === 'notion' || selectedModalApp === 'github' ? (
                <div className="space-y-4">
                  {/* Passo a Passo de Conexão */}
                  <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-2 text-left">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" />
                      Passo a passo para conectar {selectedModalApp === 'discord' ? 'o Discord' : selectedModalApp === 'slack' ? 'o Slack' : selectedModalApp === 'notion' ? 'o Notion' : selectedModalApp === 'github' ? 'o GitHub' : 'seu Webhook'}:
                    </h4>
                    {selectedModalApp === 'discord' && (
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>No Discord, vá nas <strong>Configurações do Servidor</strong> ➔ <strong>Integrações</strong> ➔ <strong>Webhooks</strong>.</li>
                        <li>Clique em <strong>Novo Webhook</strong>, escolha o canal desejado e clique em <strong>Copiar URL do Webhook</strong>.</li>
                        <li>Cole o link copiado no campo abaixo e clique em <strong>Salvar Webhook e Ativar</strong>.</li>
                      </ol>
                    )}
                    {selectedModalApp === 'slack' && (
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>Acesse <strong>api.slack.com/apps</strong> e crie um aplicativo com a opção <strong>Incoming Webhooks</strong>.</li>
                        <li>Ative o recurso e adicione um novo webhook selecionando o canal de destino (ex: <em>#devban</em>).</li>
                        <li>Copie a Webhook URL gerada, cole no campo abaixo e clique em <strong>Salvar Webhook e Ativar</strong>.</li>
                      </ol>
                    )}
                    {selectedModalApp === 'notion' && (
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>Acesse <strong>notion.so/my-integrations</strong> e crie uma nova integração de API.</li>
                        <li>Copie a chave <strong>Internal Integration Secret</strong> gerada (começa com <em>secret_...</em>).</li>
                        <li>No seu banco de dados no Notion, clique em <strong>... ➔ Conectar a ➔ Escolher sua integração</strong>.</li>
                      </ol>
                    )}
                    {selectedModalApp === 'github' && (
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>No seu repositório no GitHub, acesse <strong>Settings ➔ Webhooks ➔ Add webhook</strong>.</li>
                        <li>no campo <em>Payload URL</em>, informe o endpoint do Devban e selecione Content-type como <strong>application/json</strong>.</li>
                        <li>Selecione os eventos de <strong>Pull requests</strong> e salve o Webhook.</li>
                      </ol>
                    )}
                    {selectedModalApp === 'custom_webhook' && (
                      <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>No Zapier, Make ou n8n, crie um novo fluxo de trabalho com gatilho <strong>Custom Webhook / Catch Hook</strong>.</li>
                        <li>Copie a URL de destino gerada pela ferramenta de automação.</li>
                        <li>Cole o link no campo abaixo para enviar atualizações de cartões em JSON automaticamente.</li>
                      </ol>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      {selectedModalApp === 'notion' ? 'Token de Integração do Notion' : 'URL do Webhook'}
                    </label>
                    <input
                      type={selectedModalApp === 'notion' ? 'password' : 'url'}
                      placeholder={
                        selectedModalApp === 'discord' 
                          ? 'https://discord.com/api/webhooks/...' 
                          : selectedModalApp === 'slack'
                          ? 'https://hooks.slack.com/services/...'
                          : selectedModalApp === 'notion'
                          ? 'secret_...'
                          : 'https://api.suaempresa.com/webhook'
                      }
                      value={selectedModalApp === 'notion' ? notionTokenInput : webhookUrlInput}
                      onChange={e => selectedModalApp === 'notion' ? setNotionTokenInput(e.target.value) : setWebhookUrlInput(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">
                      {selectedModalApp === 'github' ? 'Ações do Webhook:' : selectedModalApp === 'notion' ? 'Preferências de Sincronização:' : 'Eventos Notificados:'}
                    </label>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {selectedModalApp === 'discord' && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Enviar alerta ao canal quando um novo cartão for criado</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Enviar alerta ao canal quando um cartão for movido para "Concluído"</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Alertas de tarefa próxima do prazo (1 hora antes)</span>
                          </label>
                        </>
                      )}
                      {selectedModalApp === 'notion' && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Criar nova página no Notion ao adicionar cartão no Devban</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Atualizar status/coluna no Notion ao arrastar cartão no Devban</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Sincronizar checklists e responsáveis do cartão</span>
                          </label>
                        </>
                      )}
                      {selectedModalApp === 'github' && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Mover cartão para "Concluído" ao fechar a Pull Request no repositório</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Inserir link da Pull Request nos comentários do cartão</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded accent-primary" />
                            <span>Vincular branches/commits nos detalhes do cartão</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveWebhook(selectedModalApp)}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md cursor-pointer"
                  >
                    Salvar e Ativar Integração
                  </button>
                </div>
              ) : selectedModalApp === 'google_calendar' ? (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto">
                    <CalendarIcon size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-foreground">Conta Google Vinculada</h3>
                    <p className="text-xs text-muted-foreground">{userEmail || integrationsState.google_calendar?.config?.email || 'Conta Google Conectada'}</p>
                  </div>

                  {/* Passo a Passo Google Agenda */}
                  <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-2 text-left">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" />
                      Como funciona a sincronização:
                    </h4>
                    <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                      <li>Conecte sua conta do Google clicando em <strong>Conectar</strong>.</li>
                      <li>Escolha a qual <strong>projeto</strong> do Devban deseja vincular no topo do modal.</li>
                      <li>Escolha se prefere sincronizar <strong>todos os cartões</strong> ou selecionar <strong>cartões específicos</strong>.</li>
                      <li>Sua agenda será atualizada em tempo real sempre que você criar, editar datas ou mover cartões!</li>
                    </ol>
                  </div>

                  {/* Sync Mode Toggle */}
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

                    {/* Card Selection List */}
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
                            <p className="text-[10px] text-muted-foreground text-center">
                              {selectedCardIds.length} cartão(ão) selecionado(s)
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-muted/30 border border-border rounded-2xl text-left space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Modo de Sincronização:</span>
                      <span className="font-bold text-primary">Bi-direcional</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Agenda Destino:</span>
                      <span className="font-bold text-foreground">Devban (Principal)</span>
                    </div>
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
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">Token de Integração / API Key</label>
                    <input
                      type="password"
                      placeholder="secret_xxxxxxxxxxxxxxxx"
                      value={notionTokenInput}
                      onChange={e => setNotionTokenInput(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                    />
                  </div>

                  <button
                    onClick={() => {
                      toast.success('Token salvo!');
                      setSelectedModalApp(null);
                    }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Salvar Conexão
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
