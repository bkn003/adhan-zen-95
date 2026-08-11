import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminAccess {
  isSuperAdmin: boolean;
  /** Mosques this signed-in user administers (active accounts only). */
  adminLocationIds: string[];
  isMosqueAdmin: boolean;
  loading: boolean;
}

/**
 * Resolves which admin surfaces the signed-in user may open.
 * Signed-out (or anonymous) users get no admin access at all.
 */
export const useAdminAccess = (): AdminAccess => {
  const { user, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: ['admin-access', user?.id],
    enabled: isSignedIn && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [roles, mosques] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user!.id),
        supabase.from('mosque_admin_users').select('location_id, is_paused').eq('user_id', user!.id),
      ]);
      const isSuperAdmin = (roles.data ?? []).some((r: any) => r.role === 'super_admin');
      const adminLocationIds = (mosques.data ?? [])
        .filter((r: any) => !r.is_paused)
        .map((r: any) => r.location_id as string);
      return { isSuperAdmin, adminLocationIds };
    },
  });

  return {
    isSuperAdmin: !!query.data?.isSuperAdmin,
    adminLocationIds: query.data?.adminLocationIds ?? [],
    isMosqueAdmin: (query.data?.adminLocationIds ?? []).length > 0,
    loading: query.isLoading,
  };
};
