import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useInstructorAnalytics } from '@/hooks/useAnalytics';
import { BookOpen, Radio, Users, TrendingUp } from 'lucide-react';

export default function InstructorDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: analytics, isLoading } = useInstructorAnalytics(user?.id);

  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.dashboard')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('instructor.courses')}
          value={isLoading ? '-' : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title={t('stats.active_sessions')}
          value={isLoading ? '-' : analytics?.activeSessions ?? 0}
          icon={Radio}
          variant="success"
        />
        <StatCard
          title={t('stats.total_students')}
          value={isLoading ? '-' : analytics?.totalStudents ?? 0}
          icon={Users}
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
