import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { MetricCard } from '@/components/analytics/MetricCard';
import { AttendanceBarChart, AttendancePieChart, CHART_COLORS } from '@/components/analytics/AttendanceChart';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useInstructorAnalytics } from '@/hooks/useAnalytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, Users, TrendingUp } from 'lucide-react';

export default function InstructorReports() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: analytics, isLoading } = useInstructorAnalytics(user?.id);

  const barData = (analytics?.courseStats || []).map(c => ({
    name: c.courseCode,
    rate: c.attendanceRate,
  }));

  const pieData = [
    { name: t('attendance.present'), value: analytics?.totalPresent || 0, fill: CHART_COLORS.success },
    { name: t('attendance.late'), value: analytics?.totalLate || 0, fill: CHART_COLORS.warning },
    { name: t('attendance.absent'), value: analytics?.totalAbsent || 0, fill: CHART_COLORS.destructive },
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.reports')} />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title={t('instructor.courses')}
          value={isLoading ? '-' : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          variant="primary"
        />
        <MetricCard
          title={t('stats.total_sessions')}
          value={isLoading ? '-' : analytics?.totalSessions ?? 0}
          icon={Calendar}
          variant="primary"
        />
        <MetricCard
          title={t('stats.total_students')}
          value={isLoading ? '-' : analytics?.totalStudents ?? 0}
          icon={Users}
          variant="warning"
        />
        <MetricCard
          title={t('stats.attendance_rate')}
          value={isLoading ? '-' : `${analytics?.overallAttendanceRate ?? 0}%`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.by_course')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceBarChart
              data={barData}
              xKey="name"
              bars={[{ dataKey: 'rate', fill: CHART_COLORS.primary, name: t('stats.attendance_rate') }]}
              isLoading={isLoading}
              emptyMessage={t('analytics.no_data')}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendancePieChart
              data={pieData}
              isLoading={isLoading}
              emptyMessage={t('analytics.no_data')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Course Breakdown Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('analytics.course_breakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crud.name')}</TableHead>
                  <TableHead>{t('crud.course_code')}</TableHead>
                  <TableHead className="text-center">{t('analytics.sessions_col')}</TableHead>
                  <TableHead className="text-center">{t('attendance.present')}</TableHead>
                  <TableHead className="text-center">{t('attendance.absent')}</TableHead>
                  <TableHead className="text-center">{t('attendance.late')}</TableHead>
                  <TableHead className="text-center">{t('stats.attendance_rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analytics?.courseStats || []).map(c => (
                  <TableRow key={c.courseId}>
                    <TableCell className="font-medium">{c.courseName}</TableCell>
                    <TableCell>{c.courseCode}</TableCell>
                    <TableCell className="text-center">{c.totalSessions}</TableCell>
                    <TableCell className="text-center text-success">{c.presentCount}</TableCell>
                    <TableCell className="text-center text-destructive">{c.absentCount}</TableCell>
                    <TableCell className="text-center text-warning">{c.lateCount}</TableCell>
                    <TableCell className="text-center font-semibold">{c.attendanceRate}%</TableCell>
                  </TableRow>
                ))}
                {!analytics?.courseStats?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      {t('analytics.no_data')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
