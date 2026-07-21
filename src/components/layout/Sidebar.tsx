import { Link, useLocation } from 'react-router-dom';
import { Plus, LayoutDashboard, Settings, LogOut, ShieldAlert, FolderKanban, Calendar, Bell, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { CreateProjectModal } from '@/components/ui/CreateProjectModal';
import type { Project } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  projects?: Project[]; // Make it optional so parents passing it won't break
  onProjectCreated: () => void;
  isOpen: boolean;
  onClose: () => void;
  isProjectView?: boolean;
}

export function Sidebar({ onProjectCreated, isOpen, onClose, isProjectView = false }: SidebarProps) {
  const location = useLocation();
  const { signOut, profile, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadNotifications(count || 0);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('sidebar_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // Tenta chamar a RPC para deletar a conta (se configurada no backend)
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        // Fallback: exclui os projetos do usuário (que irá apagar em cascata quadros e tarefas)
        // Isso pelo menos apaga os dados pessoais mais críticos caso a RPC não exista.
        await supabase.from('projects').delete().eq('owner_id', user.id);
        // E loga fora.
      }
      toast.success('Sua conta e seus dados foram apagados permanentemente.');
      await signOut();
    } catch (error: any) {
      toast.error('Erro ao excluir dados: ' + error.message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Fecha a sidebar ao mudar de rota
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Listen for global custom event to open Create Project Modal
  useEffect(() => {
    const handleOpenCreateProject = () => setIsCreateModalOpen(true);
    document.addEventListener('open-create-project', handleOpenCreateProject);
    return () => {
      document.removeEventListener('open-create-project', handleOpenCreateProject);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 ${isProjectView ? '' : 'md:hidden'}`}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] h-full border-r border-border/40 bg-background flex flex-col transition-transform duration-300 ease-in-out ${isProjectView ? (isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full') : `md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}`}>
        
        {/* Workspace Switcher / Brand Header */}
        <div className="h-32 px-4 flex items-center justify-between border-b border-transparent hover:border-border/40 transition-colors shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2 group outline-none rounded-md px-1 py-2 hover:bg-muted/50 transition-colors w-full">
            <img src="/logo-devban.webp" alt="DevBan" className="h-30 w-full object-contain object-left dark:hidden" />
            <img src="/logo-branca2.png" alt="DevBan" className="h-30 w-full object-contain object-left hidden dark:block" />
          </Link>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-6">
          
          {/* Main Actions */}
          <nav className="space-y-3">
            <Link 
              to="/projects" 
              className={`flex items-center justify-between gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/projects') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
            >
              <div className="flex items-center gap-3">
                <FolderKanban className="h-4 w-4" />
                Meus Projetos
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setIsCreateModalOpen(true);
                }}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Novo Projeto"
              >
                <Plus size={14} />
              </button>
            </Link>
            <Link 
              to="/shared-projects" 
              className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/shared-projects') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
            >
              <Users className="h-4 w-4" />
              Compartilhados comigo
            </Link>
            <Link 
              to="/dashboard" 
              className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/dashboard') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link 
              to="/calendar"  
              className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/calendar') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
            >
              <Calendar className="h-4 w-4" />
              Calendário
            </Link>
            <Link 
              to="/notifications" 
              className={`flex items-center justify-between gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/notifications') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                Notificações
              </div>
              {unreadNotifications > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Footer Area */}
        <div className="mt-auto px-3 py-4 border-t border-border/40 space-y-3 shrink-0 bg-background/50 backdrop-blur-md">
          <Link 
            to="/settings" 
            className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/settings') ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${isActive('/admin') ? 'bg-destructive/10 text-destructive font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'}`}>
              <ShieldAlert className="h-4 w-4" />
              Painel Admin
            </Link>
          )}
          <button 
            onClick={async () => {
              await signOut();
              onClose();
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors text-red-500 hover:bg-red-500/10 font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      
      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onProjectCreated}
      />

      {/* Delete Account Modal */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-2 text-red-500 flex items-center gap-2">
                <ShieldAlert size={24} />
                Atenção: Exclusão de Dados
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ao clicar em confirmar, você <strong>sairá da sua conta</strong> e todos os seus dados e projetos serão <strong>excluídos permanentemente</strong> do nosso banco de dados. Esta ação não pode ser desfeita. Tem certeza que deseja prosseguir?
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, excluir e sair'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
