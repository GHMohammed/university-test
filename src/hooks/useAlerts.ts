import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertType = 'mismatch' | 'absence_warning' | 'suspicious' | 'system';

export interface Alert {
  id: string;
  user_id: string | null;
  role_target: 'admin' | 'instructor' | 'student' | null;
  type: AlertType;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export interface AlertFilters {
  type?: AlertType | 'all';
  readStatus?: 'all' | 'read' | 'unread';
}

// ─── useAlerts ───────────────────────────────────────────────────────────────

export function useAlerts(filters?: AlertFilters) {
  const { user, role } = useAuth();

  return useQuery<Alert[]>({
    queryKey: ['alerts', user?.id, role, filters],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply type filter
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      // Apply read status filter
      if (filters?.readStatus === 'read') {
        query = query.eq('read_status', true);
      } else if (filters?.readStatus === 'unread') {
        query = query.eq('read_status', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Alert[];
    },
    staleTime: 30 * 1000,
  });
}

// ─── useUnreadAlertCount ─────────────────────────────────────────────────────

export function useUnreadAlertCount() {
  const { user } = useAuth();

  return useQuery<number>({
    queryKey: ['alerts-unread-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('read_status', false);

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30 * 1000,
  });
}

// ─── useMarkAlertRead ────────────────────────────────────────────────────────

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ read_status: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    },
    onError: (err) => {
      console.error('Failed to mark alert as read:', err);
      toast.error('Failed to update alert');
    },
  });
}

// ─── useMarkAllAlertsRead ────────────────────────────────────────────────────

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // For admin: update all unread alerts
      // For others: RLS will restrict to their visible alerts
      const { error } = await supabase
        .from('alerts')
        .update({ read_status: true })
        .eq('read_status', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
      toast.success('All alerts marked as read');
    },
    onError: (err) => {
      console.error('Failed to mark all alerts as read:', err);
      toast.error('Failed to update alerts');
    },
  });
}

// ─── useDeleteAlert (admin only) ─────────────────────────────────────────────

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
      toast.success('Alert deleted');
    },
    onError: (err) => {
      console.error('Failed to delete alert:', err);
      toast.error('Failed to delete alert');
    },
  });
}
