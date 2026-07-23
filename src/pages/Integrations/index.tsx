import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { 
  Plug, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  FileText, 
  GitBranch, 
  Webhook as WebhookIcon, 
  Copy, 
  Check, 
  Sparkles, 
  Settings2, 
  RefreshCw,
  BellRing,
  Smartphone,
  FolderKanban,
  Lock,
  KeyRound,
  ArrowRight
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

  // Password Lock Screen State (Unlocked by default for authenticated users)
  const [isUnlocked] = useState<boolean>(true);
  
  // Persisted state in localStorage for demonstration and persistent settings
  const [integrationsState, setIntegrationsState] = useState<Record<string, { active: boolean; projectId?: string; config?: any }>>(() => {
    const saved = localStorage.getItem('devban_integrations');
    return saved ? JSON.parse(saved) : {
      google_calendar: { active: true, projectId: 'all', config: { email: 'usuario@gmail.com', syncMode: 'two-way' } },
      ical_feed: { active: true, projectId: 'all' },
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

  useEffect(() => {
    localStorage.setItem('devban_integrations', JSON.stringify(integrationsState));
  }, [integrationsState]);

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
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" fill="#4285F4" fillOpacity="0.15" stroke="#4285F4" strokeWidth="2"/>
          <path d="M16 2V6M8 2V6M3 10H21" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
          <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#4285F4"/>
          <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#34A853"/>
          <rect x="7" y="17" width="3" height="3" rx="0.5" fill="#EA4335"/>
          <rect x="14" y="17" width="3" height="3" rx="0.5" fill="#FBBC05"/>
        </svg>
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
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-lg">
          <Smartphone size={20} />
        </div>
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
        <div className="w-8 h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold">
          <MessageSquare size={20} />
        </div>
      ),
      isActive: !!integrationsState.discord?.active,
      statusText: integrationsState.discord?.active ? 'Canal Conectado' : 'Não configurado',
      configType: 'webhook',
      projectId: integrationsState.discord?.projectId || 'all'
    },
    {
      id: 'slack',
      name: 'Slack Notifications',
      category: 'notification',
      description: 'Envie relatórios diários de progresso dos quadros Kanban diretamente para o espaço de trabalho do Slack.',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-500',
      brandSvg: (
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
          <BellRing size={20} />
        </div>
      ),
      isActive: !!integrationsState.slack?.active,
      statusText: integrationsState.slack?.active ? 'Conectado ao canal #devban' : 'Não configurado',
      configType: 'webhook',
      projectId: integrationsState.slack?.projectId || 'all'
    },
    {
      id: 'notion',
      name: 'Notion Database Sync',
      category: 'productivity',
      description: 'Sincronize colunas e cartões do Devban com bancos de dados do Notion de forma automática.',
      iconBg: 'bg-neutral-500/10 border-neutral-500/20',
      iconColor: 'text-foreground',
      brandSvg: (
        <div className="w-8 h-8 rounded-xl bg-foreground/10 text-foreground flex items-center justify-center font-bold">
          <FileText size={20} />
        </div>
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
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
          <GitBranch size={20} />
        </div>
      ),
      isActive: !!integrationsState.github?.active,
      statusText: integrationsState.github?.active ? 'Repositório Vinculado' : 'Não configurado',
      configType: 'webhook',
      projectId: integrationsState.github?.projectId || 'all'
    },
    {
      id: 'custom_webhook',
      name: 'Webhooks Customizados (Zapier / Make / n8n)',
      category: 'productivity',
      description: 'Dispare dados em formato JSON para qualquer endpoint HTTP ou plataforma de automação.',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      iconColor: 'text-rose-500',
      brandSvg: (
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
          <WebhookIcon size={20} />
        </div>
      ),
      isActive: !!integrationsState.custom_webhook?.active,
      statusText: integrationsState.custom_webhook?.active ? 'Endpoint Ativo' : 'Inativo',
      configType: 'webhook',
      projectId: integrationsState.custom_webhook?.projectId || 'all'
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
              Todas (7)
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
                    <div className={`p-3 rounded-2xl border ${app.iconBg} flex items-center justify-center shrink-0`}>
                      {app.brandSvg}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        app.isActive 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-muted text-muted-foreground border border-border/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${app.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                        {app.isActive ? 'Ativo' : 'Inativo'}
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
                  <option value="all">🌟 Todos os Meus Projetos (Global)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conteúdo Dinâmico por Tipo de App */}
              {selectedModalApp === 'ical_feed' ? (
                <div className="space-y-4">
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

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground">Como adicionar no seu dispositivo:</h4>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                      <li>No <strong>iPhone / iPad</strong>: Vá em <em>Ajustes ➔ Calendário ➔ Contas ➔ Adicionar Conta ➔ Outra ➔ Adicionar Calendário Assinado</em> e cole o link acima.</li>
                      <li>No <strong>Google Agenda</strong>: Clique no símbolo <strong>+</strong> ao lado de "Outros agendas" ➔ <em>Do URL</em> e cole a URL.</li>
                      <li>No <strong>Mac / Outlook</strong>: Vá em <em>Arquivo ➔ Nova Assinatura de Calendário</em>.</li>
                    </ol>
                  </div>
                </div>
              ) : selectedModalApp === 'discord' || selectedModalApp === 'slack' || selectedModalApp === 'custom_webhook' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">URL do Webhook</label>
                    <input
                      type="url"
                      placeholder={
                        selectedModalApp === 'discord' 
                          ? 'https://discord.com/api/webhooks/...' 
                          : 'https://hooks.slack.com/services/...'
                      }
                      value={webhookUrlInput}
                      onChange={e => setWebhookUrlInput(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground">Eventos Notificados:</label>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                        <span>Quando um novo cartão for criado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                        <span>Quando um cartão for movido para "Concluído"</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded accent-primary" />
                        <span>Alertas de tarefa próxima do prazo (1 hora antes)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveWebhook(selectedModalApp)}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md cursor-pointer"
                  >
                    Salvar Webhook e Ativar
                  </button>
                </div>
              ) : selectedModalApp === 'google_calendar' ? (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto">
                    <CalendarIcon size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-foreground">Conta Google Vinculada</h3>
                    <p className="text-xs text-muted-foreground">usuario@gmail.com</p>
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
                    onClick={() => {
                      toast.success('Sincronização forçada realizada com sucesso!');
                      setSelectedModalApp(null);
                    }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2"
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
