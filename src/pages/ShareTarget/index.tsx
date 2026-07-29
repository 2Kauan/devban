import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/utils/errorMessages';

export default function ShareTarget() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [statusText, setStatusText] = useState('Verificando status da conta e projeto...');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      toast.info('Por favor, faça login para processar o arquivo compartilhado no DevBan.');
      navigate('/login?redirect=/share-target');
      return;
    }

    const processShareTarget = async () => {
      try {
        setStatusText('Buscando seus projetos no DevBan...');
        
        // Busca os projetos onde o usuário é proprietário
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name, is_free, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!projects || projects.length === 0) {
          toast.error('Você precisa ter pelo menos um projeto criado para enviar arquivos.');
          navigate('/projects');
          return;
        }

        // Pega o projeto mais recente do usuário
        const targetProject = projects[0];

        setStatusText('Analisando assinatura e acesso Premium...');

        // Caso o usuário tenha o PREMIUM no projeto (is_free === false)
        if (!targetProject.is_free) {
          toast.success(`Abrindo Inteligência Artificial do projeto "${targetProject.name}"!`);
          navigate(`/project/${targetProject.id}/ai`);
        } else {
          // Caso NÃO tenha o PREMIUM (is_free === true)
          toast.info('Recurso de IA bloqueado. Redirecionando para a tela de pagamento do DevBan AI...');
          navigate(`/project/${targetProject.id}/checkout`);
        }
      } catch (err: any) {
        console.error('Erro no processamento do ShareTarget:', err);
        toast.error(getFriendlyErrorMessage(err, 'Não foi possível verificar seu projeto.'));
        navigate('/projects');
      }
    };

    processShareTarget();
  }, [user, isLoading, navigate]);

  return (
    <div className="flex-1 min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl animate-pulse">
          <Sparkles size={36} />
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3 tracking-tight">
        DevBan Compartilhamento
      </h2>
      
      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-8">
        {statusText}
      </p>

      <div className="flex items-center gap-3 text-primary font-semibold text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Conectando com o servidor...</span>
      </div>
    </div>
  );
}
