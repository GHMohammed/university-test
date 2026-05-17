import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionStatusBadge } from '@/components/attendance/SessionStatusBadge';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, QrCode, Radio } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useSessionAttendance, useEnrolledCount } from '@/hooks/useAttendance';
import { format } from 'date-fns';

export default function InstructorSessionDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: session, isLoading } = useSession(id);
  const { data: attendance } = useSessionAttendance(id);
  const { data: enrolledCount } = useEnrolledCount(session?.course_id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">{t('loading')}</div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">{t('no_data')}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title={t('session.details')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/instructor/sessions')}>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('cancel')}
            </Button>
            {session.status === 'active' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/instructor/sessions/${id}/qr`)}>
                  <QrCode className="h-4 w-4 me-2" />
                  {t('session.view_qr')}
                </Button>
                <Button onClick={() => navigate(`/instructor/sessions/${id}/live`)}>
                  <Radio className="h-4 w-4 me-2" />
                  {t('session.view_live')}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{session.courses?.code} - {session.courses?.name}</CardTitle>
                <CardDescription>
                  {format(new Date(session.session_date), 'EEEE, MMMM dd, yyyy')} • {format(new Date(session.start_time), 'HH:mm')} - {format(new Date(session.end_time), 'HH:mm')}
                </CardDescription>
              </div>
              <SessionStatusBadge status={session.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t('crud.classroom')}</div>
                <div className="font-medium">{session.classrooms?.name}</div>
                <div className="text-xs text-muted-foreground">{session.classrooms?.building}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('session.enrolled')}</div>
                <div className="font-medium">{enrolledCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('session.attended')}</div>
                <div className="font-medium">{attendance?.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('student.history')}</CardTitle>
            <CardDescription>
              {attendance?.length || 0} {t('session.attended')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!attendance || attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('no_data')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('session.student_name')}</TableHead>
                    <TableHead>{t('session.student_id_col')}</TableHead>
                    <TableHead>{t('session.scan_time')}</TableHead>
                    <TableHead>{t('crud.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.profiles?.full_name}</TableCell>
                      <TableCell>{record.profiles?.student_code}</TableCell>
                      <TableCell>{format(new Date(record.scanned_at), 'HH:mm:ss')}</TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={record.attendance_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
