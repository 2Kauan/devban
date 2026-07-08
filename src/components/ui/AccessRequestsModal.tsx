import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AccessRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface RequestType {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

export function AccessRequestsModal({ isOpen, onClose, projectId }: AccessRequestsModalProps) {
  const [requests, setRequests] = useState<RequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: { permission: string, job_title: string } }>({});

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, projectId]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_access_requests')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles (
            name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const reqs = (data as unknown as RequestType[]) || [];
      setRequests(reqs);
      
      // Init roles state
      const rolesInit: { [key: string]: { permission: string, job_title: string } } = {};
      reqs.forEach(r => {
        rolesInit[r.id] = { permission: 'viewer', job_title: '' };
      });
      setSelectedRole(rolesInit);
      
    } catch (error: any) {
      toast.error('Erro ao carregar solicitações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      // Atualiza o status do pedido
      const { error: updateError } = await supabase
        .from('project_access_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Se aprovado, insere o usuário na equipe
      if (action === 'approved') {
        const roleData = selectedRole[requestId] || { permission: 'viewer', job_title: '' };
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: projectId,
            user_id: userId,
            permission: roleData.permission,
            job_title: roleData.job_title || null
          });
        
        if (memberError) throw memberError;
        toast.success('Acesso concedido com sucesso!');
      } else {
        toast.success('Solicitação rejeitada.');
      }

      // Remove da lista
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error: any) {
      toast.error(`Erro ao processar solicitação: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl shadow-2xl z-[70] overflow-hidden border border-border"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold">Solicitações de Acesso</h2>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação pendente no momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 border border-border rounded-xl gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{req.profiles?.name || 'Usuário Sem Nome'}</p>
                        <p className="text-sm text-muted-foreground mb-2">{req.profiles?.email}</p>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <select 
                            value={selectedRole[req.id]?.permission || 'viewer'}
                            onChange={(e) => setSelectedRole(prev => ({...prev, [req.id]: { ...prev[req.id], permission: e.target.value }}))}
                            className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="viewer">Leitor</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Administrador</option>
                            <option value="client">Cliente</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="Cargo (ex: QA, Dev)"
                            value={selectedRole[req.id]?.job_title || ''}
                            onChange={(e) => setSelectedRole(prev => ({...prev, [req.id]: { ...prev[req.id], job_title: e.target.value }}))}
                            className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <button
                          onClick={() => handleAction(req.id, req.user_id, 'approved')}
                          disabled={processingId === req.id}
                          className="flex items-center justify-center p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Aceitar"
                        >
                          {processingId === req.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </button>
                        <button
                          onClick={() => handleAction(req.id, req.user_id, 'rejected')}
                          disabled={processingId === req.id}
                          className="flex items-center justify-center p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Recusar"
                        >
                          {processingId === req.id ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
