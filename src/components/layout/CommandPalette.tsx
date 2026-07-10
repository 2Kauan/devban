import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Settings, LogOut, Sun, Moon, Search, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const { data: projects } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <Command
          className="w-full h-full flex flex-col"
          loop
        >
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <Command.Input 
              placeholder="O que você precisa?" 
              className="w-full bg-transparent border-none outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="font-mono text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground ml-2">ESC</kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Projetos" className="px-2 py-1 text-xs font-semibold text-muted-foreground mb-1">
              {projects?.map(project => (
                <Command.Item
                  key={project.id}
                  onSelect={() => handleSelect(() => navigate(`/project/${project.id}`))}
                  className="flex items-center px-3 py-2.5 text-sm text-foreground rounded-lg cursor-pointer aria-selected:bg-muted aria-selected:text-foreground hover:bg-muted transition-colors mt-1"
                >
                  <div className="w-2.5 h-2.5 rounded-full mr-3" style={{ backgroundColor: project.color || 'var(--primary)' }} />
                  {project.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Ações" className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-3 mb-1 border-t border-border/50 pt-3">
              <Command.Item
                onSelect={() => handleSelect(() => document.dispatchEvent(new CustomEvent('open-create-project')))}
                className="flex items-center px-3 py-2.5 text-sm text-foreground rounded-lg cursor-pointer aria-selected:bg-muted hover:bg-muted transition-colors mt-1"
              >
                <FolderKanban className="w-4 h-4 mr-3 text-muted-foreground" />
                Novo Projeto
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(toggleTheme)}
                className="flex items-center px-3 py-2.5 text-sm text-foreground rounded-lg cursor-pointer aria-selected:bg-muted hover:bg-muted transition-colors mt-1"
              >
                <Sun className="w-4 h-4 mr-3 text-muted-foreground hidden dark:block" />
                <Moon className="w-4 h-4 mr-3 text-muted-foreground dark:hidden" />
                Alternar Tema (Dark/Light)
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Conta" className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-3 mb-1 border-t border-border/50 pt-3">
              <Command.Item
                onSelect={() => handleSelect(() => navigate('/team'))}
                className="flex items-center px-3 py-2.5 text-sm text-foreground rounded-lg cursor-pointer aria-selected:bg-muted hover:bg-muted transition-colors mt-1"
              >
                <User className="w-4 h-4 mr-3 text-muted-foreground" />
                Minha Equipe
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => navigate('/settings'))}
                className="flex items-center px-3 py-2.5 text-sm text-foreground rounded-lg cursor-pointer aria-selected:bg-muted hover:bg-muted transition-colors mt-1"
              >
                <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                Configurações
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => signOut())}
                className="flex items-center px-3 py-2.5 text-sm text-destructive rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive hover:bg-destructive/10 transition-colors mt-1"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sair
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
