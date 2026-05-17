import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useStudentAnalytics, StudentCourseAttendance } from '@/hooks/useAnalytics';
import { useStudentAbsenceStatuses, CourseAbsenceStatus } from '@/hooks/useAbsenceRules';
import { AbsenceStatusBadge } from '@/components/attendance/AbsenceStatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

function CourseAttendanceCard({ course, absenceStatus }: { course: StudentCourseAttendance; absenceStatus?: CourseAbsenceStatus }) {
  const { t } = useI18n();
  const variantClass = course.attendanceRate >= 70 ? 'default' : course.attendanceRate >= 50 ? 'secondary' : 'destructive';

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="font-medium text-card-foreground truncate">{course.courseName}</p>
            <p className="text-xs text-muted-foreground">{course.courseCode}</p>
          </div>
          <div className="flex items-center gap-2">
            {absenceStatus && <AbsenceStatusBadge status={absenceStatus.status} />}
            <Badge variant={variantClass}>{course.attendanceRate}%</Badge>
          </div>
        </div>
        <Progress value={course.attendanceRate} className="h-2 mb-2" />
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{course.attended} {t('session.attended')}</span>
          <span className="text-destructive">{course.absent} {t('attendance.absent')}</span>
          <span>{course.totalSessions} {t('analytics.sessions_col')}</span>
        </div>
        {absenceStatus && (
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{t('absence.absences' as any)}: {absenceStatus.absences}/{absenceStatus.maxAbsenceCount}</span>
            <span>{t('absence.threshold' as any)}: {absenceStatus.warningThresholdPercent}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: analytics, isLoading } = useStudentAnalytics(user?.id);
  const { data: absenceStatuses } = useStudentAbsenceStatuses(user?.id);

  const absenceMap = new Map((absenceStatuses || []).map(s => [s.courseId, s]));

  return (
    <DashboardLayout>
      <PageHeader title={t('student.dashboard')} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('student.courses')}
          value={isLoading ? '-' : analytics?.totalEnrolled ?? 0}
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title={t('stats.total_sessions')}
          value={isLoading ? '-' : analytics?.totalSessions ?? 0}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title={t('stats.attendance_rate')}
          value={isLoading ? '-' : `${analytics?.overallRate ?? 0}%`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title={t('analytics.total_absences')}
          value={isLoading ? '-' : analytics?.totalAbsent ?? 0}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Course Attendance Cards */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('analytics.course_attendance')}</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : analytics?.courseAttendance?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.courseAttendance.map(c => (
              <CourseAttendanceCard
                key={c.courseId}
                course={c}
                absenceStatus={absenceMap.get(c.courseId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('analytics.no_data')}</p>
        )}
      </section>
    </DashboardLayout>
  );
}
