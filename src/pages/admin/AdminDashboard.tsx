import { useI18n } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAdminAnalytics } from '@/hooks/useAnalytics';
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data: analytics, isLoading } = useAdminAnalytics();

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.dashboard')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.total_students')}
          value={isLoading ? '-' : analytics?.totalStudents ?? 0}
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title={t('stats.total_instructors')}
          value={isLoading ? '-' : analytics?.totalInstructors ?? 0}
          icon={Users}
          variant="success"
        />
        <StatCard
          title={t('stats.total_courses')}
          value={isLoading ? '-' : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard
          title={t('stats.attendance_rate')}
          value={isLoading ? '-' : `${analytics?.overallAttendanceRate ?? 0}%`}
          icon={TrendingUp}
          variant="primary"
        />
      </div>
    </DashboardLayout>
  );
}
