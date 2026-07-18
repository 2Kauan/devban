import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useStockQuery(projectCount: number) {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: ['stock', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: payments } = await supabase
        .from('payments')
        .select('value')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .is('project_id', null);

      const { data: profile } = await supabase
        .from('profiles')
        .select('consumed_premium_slots')
        .eq('id', user.id)
        .single();

      const consumedSlots = profile?.consumed_premium_slots || 0;
      const totalPurchasedValue = payments?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
      const totalPurchasedSlots = Math.floor(totalPurchasedValue / 7.00);
      const premiumCount = projectCount;

      return Math.max(0, totalPurchasedSlots - premiumCount - consumedSlots);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
