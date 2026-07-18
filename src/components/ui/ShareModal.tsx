import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Globe, Lock, ChevronDown, Check, Trash2 } from 'lucide-react';
import type { Project } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdate: () => void;
}

interface Member {
  id: string;
  user_id: string;
  permission: string;
  profiles: {
    name: string;
    email: string;
    avatar_url: string;
  };
}

export function ShareModal({ isOpen, onClose, project, onUpdate }: ShareModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Local state for immediate UI feedback before saving to DB
  const [shareEnabled, setShareEnabled] = useState(false);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [isGeneralAccessOpen, setIsGeneralAccessOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      setShareEnabled(project.share_enabled || false);
      setSharePermission(project.share_permission || 'view');
      fetchMembers();
    }
  }, [isOpen, project]);

  const fetchMembers = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id, user_id, permission,
          profiles (name, email, avatar_url)
        `)
        .eq('project_id', project.id);
        
      if (error) throw error;
      setMembers((data as any) || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!project) return;
    const shareUrl = `${window.location.origin}/shared/${project.share_token}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success('Link copiado!');
    } else {
      prompt('Copie o link:', shareUrl);
      toast.success('Link gerado!');
    }
  };

  const updateShareSettings = async (enabled: boolean, permission: 'view' | 'edit') => {
    if (!project) return;
    setShareEnabled(enabled);
    setSharePermission(permission);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          share_enabled: enabled,
          share_permission: permission
        })
        .eq('id', project.id);
        
      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao atualizar configurações: ' + error.message);
      // Revert on error
      setShareEnabled(project.share_enabled || false);
      setSharePermission(project.share_permission || 'view');
    }
  };

  const updateMemberPermission = async (memberId: string, newPermission: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ permission: newPermission })
        .eq('id', memberId);
      if (error) throw error;
      toast.success('Permissão atualizada');
      fetchMembers();
      onUpdate();
    } catch (error: any) {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      toast.success('Usuário removido do projeto');
      fetchMembers();
      onUpdate();
      if (project) {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
        queryClient.invalidateQueries({ queryKey: ['projectMemberCounts'] });
      }
    } catch (error: any) {
      toast.error('Erro ao remover usuário: ' + error.message);
    }
  };

  if (!isOpen || !project) return null;

  const isOwner = project.owner_id === user?.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[500px] bg-card border border-border shadow-xl rounded-2xl z-50 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-xl font-bold">Compartilhar "{project.name}"</h2>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 pt-2 overflow-y-auto custom-scrollbar flex-1 min-h-[350px]">
              
              {/* Pessoas com acesso */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Pessoas com acesso</h3>
                <div className="space-y-3">
                  {/* Owner (Always show first, ideally fetched from profiles, but we assume current user if owner) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {isOwner ? user?.user_metadata?.full_name?.charAt(0) || 'O' : 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {isOwner ? `${user?.user_metadata?.full_name || 'Você'} (proprietário)` : 'Dono do Projeto'}
                        </p>
                        {isOwner && <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Proprietário</span>
                  </div>

                  {/* Members */}
                  {isLoading ? (
                    <div className="text-center py-2"><div className="animate-spin h-4 w-4 border-b-2 border-primary mx-auto rounded-full"></div></div>
                  ) : (
                    members.map(member => (
                      <div key={member.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          {member.profiles.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border">
                              {member.profiles.name?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <p className="text-sm font-medium leading-none">{member.profiles.name}</p>
                            {!member.profiles.email?.includes('devban.local') && (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px] sm:max-w-[180px]">{member.profiles.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner ? (
                            <div className="relative">
                              <select 
                                value={member.permission}
                                onChange={(e) => updateMemberPermission(member.id, e.target.value)}
                                className="appearance-none bg-muted/30 border border-border text-xs font-medium rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <option value="admin">Administrador</option>
                                <option value="editor">Editor</option>
                                <option value="leitor">Leitor</option>
                                <option value="cliente">Cliente</option>
                              </select>
                              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-xs bg-muted/50 border border-border px-3 py-1 rounded-md text-muted-foreground capitalize">
                              {member.permission === 'editor' ? 'Editor' : member.permission}
                            </span>
                          )}
                          
                          {isOwner && (
                            <button 
                              onClick={() => removeMember(member.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              title="Remover acesso"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Acesso Geral */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Acesso geral</h3>
                
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${shareEnabled ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {shareEnabled ? <Globe size={20} /> : <Lock size={20} />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="relative">
                      {isOwner ? (
                        <button 
                          onClick={() => setIsGeneralAccessOpen(!isGeneralAccessOpen)}
                          className="flex items-center gap-1 text-sm font-medium hover:bg-muted py-1 px-2 -ml-2 rounded-md transition-colors"
                        >
                          {shareEnabled ? 'Qualquer pessoa com o link' : 'Restrito'}
                          <ChevronDown size={14} className="text-muted-foreground" />
                        </button>
                      ) : (
                        <p className="text-sm font-medium py-1">
                          {shareEnabled ? 'Qualquer pessoa com o link' : 'Restrito'}
                        </p>
                      )}
                      
                      {/* General Access Dropdown */}
                      {isGeneralAccessOpen && isOwner && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsGeneralAccessOpen(false)} />
                          <div className="absolute left-0 top-8 w-64 bg-card border border-border shadow-lg rounded-lg py-1 z-20">
                            <button 
                              onClick={() => { updateShareSettings(false, sharePermission); setIsGeneralAccessOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between"
                            >
                              Restrito
                              {!shareEnabled && <Check size={14} />}
                            </button>
                            <button 
                              onClick={() => { updateShareSettings(true, sharePermission); setIsGeneralAccessOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between"
                            >
                              Qualquer pessoa com o link
                              {shareEnabled && <Check size={14} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5 ml-1">
                      {shareEnabled 
                        ? 'Quem tiver o link pode acessar' 
                        : 'Apenas convidados podem acessar'}
                    </p>
                  </div>

                  {/* Role Dropdown (Removed as links are always read-only) */}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between gap-3 rounded-b-2xl flex-wrap">
              <button
                onClick={handleCopyLink}
                disabled={!shareEnabled && !isOwner}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-muted rounded-full font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed text-primary"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                <span className="hidden sm:inline">Copiar link</span>
                <span className="inline sm:hidden">Copiar</span>
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium transition-colors text-sm flex-1 sm:flex-none text-center"
              >
                Concluído
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
