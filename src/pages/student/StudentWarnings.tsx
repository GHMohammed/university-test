import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AlertCard } from '@/components/alerts/AlertCard';
import { AlertFilter } from '@/components/alerts/AlertFilter';
import { AbsenceStatusBadge } from '@/components/attendance/AbsenceStatusBadge';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead, AlertFilters } from '@/hooks/useAlerts';
import { useStudentAbsenceStatuses } from '@/hooks/useAbsenceRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCheck } from 'lucide-react';

export default function StudentWarnings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [filters, setFilters] = useState<AlertFilters>({ type: 'all', readStatus: 'all' });

  const { data: alerts, isLoading: alertsLoading } = useAlerts(filters);
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  const { data: absenceStatuses, isLoading: absenceLoading } = useStudentAbsenceStatuses(user?.id);

  const unreadCount = alerts?.filter(a => !a.read_status).length || 0;

  return (
    <DashboardLayout>
      <PageHeader title={t('student.warnings')} />

      {/* Absence Status Overview */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('absence.status_overview' as any)}</h2>
        {absenceLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : absenceStatuses?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {absenceStatuses.map(s => {
              const progressValue = s.maxAbsenceCount > 0
                ? Math.min(100, Math.round((s.absences / s.maxAbsenceCount) * 100))
                : 0;
              return (
                <Card key={s.courseId} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-card-foreground truncate">{s.courseName}</p>
                        <p className="text-xs text-muted-foreground">{s.courseCode}</p>
                      </div>
                      <AbsenceStatusBadge status={s.status} />
                    </div>
                    <Progress value={progressValue} className="h-2 mb-2" />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{t('absence.absences' as any)}: {s.absences}/{s.maxAbsenceCount}</span>
                      <span>{t('absence.threshold' as any)}: {s.warningThresholdPercent}%</span>
                      <span>{t('analytics.sessions_col')}: {s.totalSessions}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('analytics.no_data')}</p>
        )}
      </section>

      {/* Alerts Section */}
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
        {alertsLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </>
        ) : alerts?.length ? (
          alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={(id) => markRead.mutate(id)}
              showDelete={false}
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
