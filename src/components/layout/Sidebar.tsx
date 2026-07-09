import { Link, useLocation } from 'react-router-dom';
import { Plus, LayoutDashboard, FolderKanban, Users, Settings, LogOut, ShieldAlert, X, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { CreateProjectModal } from '@/components/ui/CreateProjectModal';
import type { Project } from '@/types/database';

interface SidebarProps {
  projects: Project[];
  onProjectCreated: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ projects, onProjectCreated, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Fecha a sidebar ao mudar de rota
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-background md:bg-muted/20 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full hidden md:flex'}`}>
        <div className="p-4 flex items-center justify-between md:hidden border-b border-border/50">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-6">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Novo Projeto
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Visão Geral
          </Link>
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Geral
            </p>
          </div>
          <Link 
            to="/team" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/team') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          >
            <Users className="h-5 w-5" />
            Equipe
          </Link>
          <Link 
            to="/reports" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/reports') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          >
            <BarChart3 className="h-5 w-5" />
            Relatórios
          </Link>
          {profile?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/admin') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              <ShieldAlert className="h-5 w-5" />
              Painel Admin
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-border/50 space-y-2">
          <Link 
            to="/settings" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button 
            onClick={() => signOut()} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>
      
      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onProjectCreated}
      />
    </>
  );
}
