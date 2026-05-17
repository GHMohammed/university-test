import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useStudentEnrolledCourses } from '@/hooks/useStudentData';
import { BookOpen, User, MapPin, Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react';

export default function StudentCourses() {
  const { t, dir } = useI18n();
  const { data: courses = [], isLoading } = useStudentEnrolledCourses();
  const navigate = useNavigate();

  const dayName = (d: number) => t(`crud.day_${d}` as Parameters<typeof t>[0]);

  const rateVariant = (rate: number) => {
    if (rate >= 75) return 'default';
    if (rate >= 50) return 'secondary';
    return 'destructive';
  };

  return (
    <DashboardLayout>
      <PageHeader title={t('student.courses')} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-lg" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title={t('no_data')} icon={BookOpen} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card
              key={course.courseId}
              className="cursor-pointer transition-shadow hover:shadow-lg group"
              onClick={() => navigate(`/student/courses/${course.courseId}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-base truncate">{course.courseName}</p>
                    <p className="text-sm text-muted-foreground">{course.courseCode}</p>
                  </div>
                  <Badge variant={rateVariant(course.attendanceRate)}>
                    {course.attendanceRate}%
                  </Badge>
                </div>

                {course.instructorName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{course.instructorName}</span>
                  </div>
                )}

                {course.classroomName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{course.classroomName}</span>
                  </div>
                )}

                {course.scheduleDays.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{course.scheduleDays.map(dayName).join(', ')}</span>
                  </div>
                )}

                {course.scheduleTimeLabel && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{course.scheduleTimeLabel}</span>
                  </div>
                )}

                <Progress value={course.attendanceRate} className="h-2" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('analytics.total_attended')}: {course.presentCount + course.lateCount}</span>
                  <span>{t('analytics.total_absences')}: {course.absentCount}</span>
                </div>

                <div className="flex justify-end">
                  {dir === 'rtl' ? (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
