import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { MetricCard } from '@/components/analytics/MetricCard';
import { AttendanceBarChart, AttendancePieChart, CHART_COLORS } from '@/components/analytics/AttendanceChart';
import { useI18n } from '@/lib/i18n';
import { useAdminAnalytics } from '@/hooks/useAnalytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Users, BookOpen, Calendar, TrendingUp, Radio } from 'lucide-react';

export default function AdminReports() {
  const { t } = useI18n();
  const { data: analytics, isLoading } = useAdminAnalytics();

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
      <PageHeader title={t('admin.reports')} />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <MetricCard
          title={t('stats.total_students')}
          value={isLoading ? '-' : analytics?.totalStudents ?? 0}
          icon={GraduationCap}
          variant="primary"
        />
        <MetricCard
          title={t('stats.total_instructors')}
          value={isLoading ? '-' : analytics?.totalInstructors ?? 0}
          icon={Users}
          variant="success"
        />
        <MetricCard
          title={t('stats.total_courses')}
          value={isLoading ? '-' : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          variant="warning"
        />
        <MetricCard
          title={t('stats.total_sessions')}
          value={isLoading ? '-' : analytics?.totalSessions ?? 0}
          icon={Calendar}
          variant="primary"
        />
        <MetricCard
          title={t('stats.active_sessions')}
          value={isLoading ? '-' : analytics?.activeSessions ?? 0}
          icon={Radio}
          variant="success"
        />
        <MetricCard
          title={t('stats.attendance_rate')}
          value={isLoading ? '-' : `${analytics?.overallAttendanceRate ?? 0}%`}
          icon={TrendingUp}
          variant="primary"
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
      <Card className="shadow-card mb-6">
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

      {/* Instructor Breakdown Table */}
      {analytics?.instructorStats && analytics.instructorStats.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.by_instructor')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crud.instructor')}</TableHead>
                  <TableHead className="text-center">{t('analytics.sessions_col')}</TableHead>
                  <TableHead className="text-center">{t('attendance.present')}</TableHead>
                  <TableHead className="text-center">{t('stats.attendance_rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.instructorStats.map(i => (
                  <TableRow key={i.instructorId}>
                    <TableCell className="font-medium">{i.instructorName}</TableCell>
                    <TableCell className="text-center">{i.totalSessions}</TableCell>
                    <TableCell className="text-center text-success">{i.presentCount}</TableCell>
                    <TableCell className="text-center font-semibold">{i.attendanceRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
