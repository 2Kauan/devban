import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users, CreditCard, LayoutTemplate, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    payments: 0,
    revenue: 0
  });
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Users count
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // Projects count
      const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      
      // Payments info
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id, value, status, created_at, method,
          user:profiles(name, email)
        `)
        .order('created_at', { ascending: false });

      const confirmedPayments = (paymentsData || []).filter(p => p.status === 'confirmed');
      const revenue = confirmedPayments.reduce((acc, p) => acc + Number(p.value), 0);

      setStats({
        users: usersCount || 0,
        projects: projectsCount || 0,
        payments: confirmedPayments.length,
        revenue
      });
      
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-muted/10 h-full overflow-y-auto">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/projects" className="w-10 h-10 flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema SaaS.</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
            <h3 className="text-3xl font-bold">{stats.users}</h3>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-600">
            <LayoutTemplate size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Projetos</p>
            <h3 className="text-3xl font-bold">{stats.projects}</h3>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Projetos Vendidos</p>
            <h3 className="text-3xl font-bold">{stats.payments}</h3>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
            <h3 className="text-3xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">Últimos Pagamentos (Asaas)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Método</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum pagamento registrado ainda.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{payment.user?.name || 'Usuário'}</div>
                      <div className="text-xs text-muted-foreground">{payment.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 uppercase text-xs font-semibold text-muted-foreground">
                      {payment.method}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'confirmed' ? 'bg-green-500/10 text-green-600' :
                        payment.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-red-500/10 text-red-600'
                      }`}>
                        {payment.status === 'confirmed' ? 'Confirmado' : payment.status === 'pending' ? 'Pendente' : 'Falhou'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
