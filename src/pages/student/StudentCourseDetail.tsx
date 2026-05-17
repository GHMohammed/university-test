import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { useI18n } from '@/lib/i18n';
import { useStudentCourseDetail } from '@/hooks/useStudentData';
import { ArrowLeft, ArrowRight, BookOpen, User, MapPin, Building } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, dir } = useI18n();
  const { data: detail, isLoading } = useStudentCourseDetail(id);
  const navigate = useNavigate();

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!detail) {
    return (
      <DashboardLayout>
        <EmptyState title={t('no_data')} icon={BookOpen} />
      </DashboardLayout>
    );
  }

  const stats = [
    { label: t('stats.total_sessions'), value: detail.totalSessions },
    { label: t('attendance.present'), value: detail.presentCount },
    { label: t('attendance.late'), value: detail.lateCount },
    { label: t('attendance.absent'), value: detail.absentCount },
    { label: t('attendance.rejected'), value: detail.rejectedCount },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/courses')}>
            <BackIcon className="h-5 w-5" />
          </Button>
          <PageHeader title={`${detail.courseCode} - ${detail.courseName}`} />
        </div>

        {/* Course Info */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{detail.courseName}</h3>
              <Badge variant={detail.attendanceRate >= 75 ? 'default' : detail.attendanceRate >= 50 ? 'secondary' : 'destructive'}>
                {detail.attendanceRate}%
              </Badge>
            </div>

            {detail.instructorName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{detail.instructorName}</span>
              </div>
            )}
            {detail.department && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span>{detail.department}</span>
              </div>
            )}
            {detail.classroomName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{detail.classroomName}</span>
              </div>
            )}
            {detail.scheduleInfo && (
              <p className="text-sm text-muted-foreground">{detail.scheduleInfo}</p>
            )}

            <Progress value={detail.attendanceRate} className="h-2.5 mt-2" />

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
              {stats.map(s => (
                <div key={s.label} className="text-center p-2 rounded-md bg-muted/50">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('history.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.history.length === 0 ? (
              <EmptyState title={t('history.no_records')} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('history.date')}</TableHead>
                      <TableHead>{t('history.status')}</TableHead>
                      <TableHead>{t('crud.classroom')}</TableHead>
                      <TableHead>{t('history.time')}</TableHead>
                      <TableHead>{t('manual.source_qr')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.history.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>{format(new Date(h.sessionDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <AttendanceStatusBadge status={h.status as any} />
                        </TableCell>
                        <TableCell>{h.classroomName || '-'}</TableCell>
                        <TableCell>{h.scannedAt ? format(new Date(h.scannedAt), 'HH:mm:ss') : '-'}</TableCell>
                        <TableCell>{h.source}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
