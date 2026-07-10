import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { Settings, Save, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectSettings() {
  const { project } = useOutletContext<{ project: Project }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === project.owner_id;

  useEffect(() => {
    setName(project.name);
    setDescription(project.description || '');
  }, [project]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome do projeto é obrigatório.');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: name.trim(), description: description.trim() })
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Projeto atualizado com sucesso!');
      
      // In a real app we might want to refresh the project context here
      // But the ProjectLayout fetches on mount, so it might need a global state or force refresh
      // For now, toast is enough feedback.
    } catch (error: any) {
      toast.error('Erro ao atualizar projeto: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmName = prompt(`Para excluir este projeto, digite o nome do projeto "${project.name}":`);
    if (confirmName !== project.name) {
      if (confirmName !== null) toast.error('Nome incorreto. Exclusão cancelada.');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      
      toast.success('Projeto excluído com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Erro ao excluir projeto: ' + error.message);
      setIsDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Settings size={32} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h3>
        <p className="max-w-md">Apenas o proprietário do projeto pode acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Settings className="text-primary" size={28} />
          Configurações do Projeto
        </h1>
        <p className="text-muted-foreground mt-2">
          Edite as informações básicas ou exclua o projeto definitivamente.
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">Informações Gerais</h2>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Nome do Projeto <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Novo App Mobile"
                className="w-full bg-background border border-border/60 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do projeto..."
                rows={4}
                className="w-full bg-background border border-border/60 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving || !name.trim() || (name === project.name && description === (project.description || ''))}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all w-full justify-center sm:w-auto"
              >
                {isSaving ? (
                  <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>

        <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
          
          <h2 className="text-lg font-bold text-destructive flex items-center gap-2 mb-2">
            <AlertTriangle size={20} />
            Zona de Perigo
          </h2>
          <p className="text-sm text-foreground/80 mb-6">
            A exclusão do projeto apaga todos os cartões, colunas, arquivos e atividades permanentemente. Esta ação não pode ser desfeita.
          </p>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {isDeleting ? (
              <div className="w-5 h-5 rounded-full border-2 border-destructive-foreground border-t-transparent animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Excluir Projeto Permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}
