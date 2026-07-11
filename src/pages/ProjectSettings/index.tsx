import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { Settings, Save, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteProjectModal } from '@/components/ui/DeleteProjectModal';

export default function ProjectSettings() {
  const { project } = useOutletContext<{ project: Project }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    const isChangingName = name.trim() !== project.name;

    if (isChangingName) {
      if (project.name_changed) {
        toast.error('O nome do projeto só pode ser alterado uma vez.');
        setName(project.name);
        return;
      }
      
      setShowConfirmModal(true);
      return;
    }
    
    await submitChanges(false);
  };

  const submitChanges = async (isChangingName: boolean) => {
    setIsSaving(true);
    setShowConfirmModal(false);
    try {
      const updates: any = { description: description.trim() };
      if (isChangingName) {
        updates.name = name.trim();
        updates.name_changed = true;
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Projeto atualizado com sucesso!');
      
      // Update local object to avoid having to reload immediately
      if (isChangingName) {
        project.name = name.trim();
        project.name_changed = true;
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar projeto: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex justify-between items-center">
                <span>Nome do Projeto <span className="text-destructive">*</span></span>
                {project.name_changed && <span className="text-[11px] text-muted-foreground font-normal">Nome já alterado</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={project.name_changed}
                placeholder="Ex: Novo App Mobile"
                className={`w-full bg-background border border-border/60 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${project.name_changed ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''}`}
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card w-full max-w-[450px] rounded-2xl shadow-2xl border border-border/60 overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 pb-0 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Confirmar alteração de nome?</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Atenção: Você só poderá alterar o nome do projeto <strong>UMA ÚNICA VEZ</strong>. 
                    Após salvar, o campo de nome será bloqueado definitivamente para futuras edições.
                  </p>
                  
                  <div className="mt-4 p-3 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground">
                    <span className="text-muted-foreground">Novo nome:</span> <strong className="ml-1">{name.trim()}</strong>
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => submitChanges(true)}
                  disabled={isSaving}
                  className="bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 px-5 py-2 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    'Confirmar Alteração'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteProjectModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        projectName={project.name}
        projectId={project.id}
        onSuccess={() => navigate('/dashboard')}
      />
    </div>
  );
}
