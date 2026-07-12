import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { translateAuthError } from '@/utils/authErrors';
import { useAuth } from '@/contexts/AuthContext';

const resetSchema = z.object({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error('Erro ao redefinir senha: ' + translateAuthError(error.message));
        return;
      }

      // Deslogar o usuário para limpar a sessão temporária criada pelo link de recuperação
      await supabase.auth.signOut();

      toast.success('Senha atualizada com sucesso! Faça login com a nova senha.');
      navigate('/login');
    } catch (error: any) {
      toast.error('Ocorreu um erro ao redefinir a senha: ' + translateAuthError(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20 relative overflow-hidden p-4">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-background rounded-2xl shadow-xl border border-border/50 p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">D</span>
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">DevBan</span>
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Nova Senha</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {!user ? 'Sessão de recuperação inválida' : 'Insira sua nova senha abaixo para redefini-la'}
          </p>
        </div>

        {authLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              O link de redefinição de senha é inválido, expirou ou já foi utilizado. 
            </p>
            <p className="text-xs text-muted-foreground">
              Por favor, volte à tela de login e solicite um novo e-mail de recuperação.
            </p>

            <Link
              to="/login"
              className="w-full h-11 flex justify-center items-center bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  {...register('password')}
                  className="w-full h-11 pl-4 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  {...register('confirmPassword')}
                  className="w-full h-11 pl-4 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-11 flex justify-center items-center bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-background"></div> : 'Atualizar Senha'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Lembrou a senha?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Voltar ao login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
