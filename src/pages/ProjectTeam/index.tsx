import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { ShareModal } from '@/components/ui/ShareModal';
import { Users, UserPlus, Settings, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileModal } from '@/components/ui/UserProfileModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { KanbanCardType } from '@/types/kanban';
import { useQueryClient } from '@tanstack/react-query';

interface Member {
  user_id: string;
  permission: string;
  job_title: string | null;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string;
    email?: string;
  };
}

export default function ProjectTeam() {
  const { project } = useOutletContext<{ project: Project }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = project.owner_id === user?.id;

  const [members, setMembers] = useState<Member[]>([]);
  const isAdmin = members.find(m => m.user_id === user?.id)?.permission === 'admin';
  const canManage = isOwner || isAdmin;
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Para armazenar mudanças pendentes antes de salvar
  const [pendingChanges, setPendingChanges] = useState<Record<string, { permission?: string, job_title?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [projectCards, setProjectCards] = useState<KanbanCardType[]>([]);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (project?.id) {
      fetchMembers();
    }
  }, [project?.id]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          permission,
          job_title,
          created_at,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq('project_id', project.id);

      if (error) throw error;

      const { data: ownerData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', project.owner_id)
        .single();

      const memberList: Member[] = (data || []).map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));

      // Check if owner is in the list
      const hasOwner = memberList.some(m => m.user_id === project.owner_id);
      if (!hasOwner && ownerData) {
        memberList.unshift({
          user_id: project.owner_id,
          permission: 'owner',
          job_title: 'Fundador',
          created_at: project.created_at,
          profiles: {
            name: ownerData.name,
            avatar_url: ownerData.avatar_url,
          }
        });
      }

      setMembers(memberList);

      // Fetch cards for stats
      const { data: cardsData } = await supabase
        .from('cards')
        .select(`*, assignees:card_assignees(user_id)`)
        .eq('project_id', project.id);
        
      if (cardsData) {
        setProjectCards(cardsData.map((c: any) => ({
          ...c,
          assignees: c.assignees?.map((a: any) => ({ id: a.user_id })) || []
        })));
      }

    } catch (error: any) {
      toast.error('Erro ao buscar membros: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (userId === project.owner_id) {
      toast.error('Não é possível remover o dono do projeto.');
      return;
    }
    
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Membro',
      message: 'Deseja realmente remover este membro do projeto? Ele perderá acesso imediato a todas as funcionalidades do Kanban.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', project.id)
            .eq('user_id', userId);

          if (error) throw error;
          toast.success('Membro removido com sucesso!');
          fetchMembers();
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['project', project.id] });
          queryClient.invalidateQueries({ queryKey: ['projectMemberCounts'] });
        } catch (error: any) {
          toast.error('Erro ao remover membro: ' + error.message);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleChangePermission = (memberId: string, newPerm: string) => {
    if (memberId === project.owner_id) {
      toast.error('Não é possível alterar a permissão do desenvolvedor/dono do projeto.');
      return;
    }
    
    setPendingChanges(prev => ({ ...prev, [memberId]: { ...prev[memberId], permission: newPerm } }));
    setMembers(members.map(m => m.user_id === memberId ? { ...m, permission: newPerm } : m));
  };

  const handleChangeJobTitle = (memberId: string, newTitle: string) => {
    setPendingChanges(prev => ({ ...prev, [memberId]: { ...prev[memberId], job_title: newTitle } }));
    setMembers(members.map(m => m.user_id === memberId ? { ...m, job_title: newTitle } : m));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setIsSaving(true);
    
    try {
      for (const [userId, changes] of Object.entries(pendingChanges)) {
        const { error } = await supabase
          .from('project_members')
          .update(changes)
          .eq('project_id', project.id)
          .eq('user_id', userId);
        if (error) throw error;
      }
      setPendingChanges({});
      toast.success('Alterações salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar alterações: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-8 flex flex-col items-start">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Users className="text-primary" size={28} />
          Equipe do Projeto
        </h1>
        <p className="text-muted-foreground mt-2 mb-4">
          Gerencie quem tem acesso a este projeto e defina suas permissões.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {canManage && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-5 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <UserPlus size={18} />
              Convidar Membro
            </button>
          )}
          
          {canManage && hasPendingChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Save size={18} className={isSaving ? 'animate-pulse' : ''} />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm w-full">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Membro</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Papel / Permissão</th>
                <th className="px-6 py-4">Data de Entrada</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando equipe...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <Users size={24} />
                      </div>
                      <p className="text-foreground font-medium text-lg">Nenhum membro encontrado</p>
                      <p className="text-muted-foreground max-w-sm mt-1">Este projeto ainda não possui membros adicionais.</p>
                      <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="mt-4 text-primary hover:underline font-medium"
                      >
                        Convidar agora
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={member.user_id} 
                    className="hover:bg-muted/10 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 relative group cursor-pointer" onClick={() => setSelectedProfileId(member.user_id)}>
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-medium leading-tight text-center">Ver Perfil</span>
                          </div>
                          <div className="w-full h-full rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0 text-primary font-bold">
                            {member.profiles?.avatar_url ? (
                              <img src={member.profiles.avatar_url} alt={member.profiles?.name} className="w-full h-full object-cover" />
                            ) : (
                              member.profiles?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {member.profiles?.name || 'Usuário Desconhecido'}
                            {member.user_id === project.owner_id && (
                              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Dono
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {canManage && member.permission !== 'owner' ? (
                        <input
                          type="text"
                          placeholder="Ex: Desenvolvedor"
                          value={member.job_title || ''}
                          onChange={(e) => handleChangeJobTitle(member.user_id, e.target.value)}
                          className="bg-muted/30 border border-border/60 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all w-32 sm:w-40"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{member.job_title || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.permission === 'owner' ? (
                        <div className="flex items-center gap-2 text-muted-foreground capitalize cursor-default" title="Permissão do dono não pode ser alterada">
                          <Settings size={14} /> Proprietário
                        </div>
                      ) : !canManage ? (
                        <span className="text-xs font-semibold bg-muted/50 border border-border px-3 py-1 rounded-md text-muted-foreground capitalize cursor-not-allowed">
                          {member.permission === 'editor' ? 'Editor' : member.permission}
                        </span>
                      ) : (
                        <div className="relative">
                          <select
                            value={member.permission}
                            onChange={(e) => handleChangePermission(member.user_id, e.target.value)}
                            className="appearance-none bg-muted/30 border border-border/60 rounded-lg text-sm pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all cursor-pointer hover:bg-muted/50 w-32"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Leitor</option>
                            <option value="admin">Administrador</option>
                            <option value="client">Cliente</option>
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManage && member.user_id !== project.owner_id && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Remover membro"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        project={project}
        onUpdate={fetchMembers}
      />

      <UserProfileModal
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
        userId={selectedProfileId || ''}
        projectId={project.id}
        cards={projectCards}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  );
}
