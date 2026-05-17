import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AlertCard } from '@/components/alerts/AlertCard';
import { AlertFilter } from '@/components/alerts/AlertFilter';
import { useI18n } from '@/lib/i18n';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead, useDeleteAlert, AlertFilters } from '@/hooks/useAlerts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCheck } from 'lucide-react';

export default function AdminAlerts() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<AlertFilters>({ type: 'all', readStatus: 'all' });
  
  const { data: alerts, isLoading } = useAlerts(filters);
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const deleteAlert = useDeleteAlert();

  const unreadCount = alerts?.filter(a => !a.read_status).length || 0;

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.alerts')} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AlertFilter filters={filters} onChange={setFilters} />
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            {t('alerts.mark_all_read')} ({unreadCount})
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </>
        ) : alerts?.length ? (
          alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={(id) => markRead.mutate(id)}
              onDelete={(id) => deleteAlert.mutate(id)}
              showDelete={true}
              isMarkingRead={markRead.isPending}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('alerts.no_alerts')}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
