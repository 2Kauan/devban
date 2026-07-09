import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Save, User, Mail, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ImageCropModal } from '@/components/ui/ImageCropModal';

export default function Settings() {
  const { user, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

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

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setSelectedImageSrc(imageDataUrl);
      setIsCropOpen(true);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string), false);
      reader.readAsDataURL(file);
    });
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      // Convert Blob to Base64 to save directly in the profile avatar_url
      // For a production app with many large files, Supabase Storage should be used.
      // Since it's just a small 256x256 avatar, Base64 is fine.
      const reader = new FileReader();
      reader.readAsDataURL(croppedImageBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setAvatarUrl(base64data);
        setIsCropOpen(false);
        setSelectedImageSrc(null);
      };
    } catch (e) {
      toast.error('Erro ao processar imagem.');
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
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
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="relative w-24 h-24 rounded-full bg-muted border-2 border-border/60 overflow-hidden flex items-center justify-center shrink-0 group">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-muted-foreground/50" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                      <Camera size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">Alterar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={onFileChange}
                      />
                    </label>
                  </div>
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="font-semibold text-foreground mb-1">Foto de Perfil</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Clique na imagem ao lado para fazer o upload de uma nova foto. 
                      Formatos aceitos: JPG, PNG, GIF.
                    </p>
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

      {selectedImageSrc && (
        <ImageCropModal
          isOpen={isCropOpen}
          onClose={() => {
            setIsCropOpen(false);
            setSelectedImageSrc(null);
          }}
          imageSrc={selectedImageSrc}
          onCropCompleteAction={handleCropComplete}
        />
      )}
    </div>
  );
}
