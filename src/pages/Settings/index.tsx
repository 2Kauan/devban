import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Save, User, Mail, UploadCloud, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Settings() {
  const { user, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);
        
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
      
      // In a real app, we would force the auth context to refetch the profile here
      // For now, reload the page to see changes
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen w-full bg-background overflow-hidden">
      <Sidebar projects={[]} onProjectCreated={() => {}} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/10">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 bg-background shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Configurações</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Gerencie sua conta e perfil</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-6">
            
            <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User size={20} className="text-primary" />
                Meu Perfil
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="relative w-24 h-24 rounded-full bg-muted border-2 border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-muted-foreground/50" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold">
                      <UploadCloud size={16} className="mb-1" />
                    </label>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-foreground mb-1">URL da Imagem do Perfil</label>
                    <input 
                      type="url" 
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/avatar.jpg"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Insira um link para sua foto de perfil.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-semibold text-foreground mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Email</label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed">
                    <Mail size={16} />
                    {user?.email}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado por aqui.</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
