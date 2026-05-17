import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserCheck, TrendingUp, Trash2 } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useSessionAttendance, useEnrolledCount, useDeleteAttendance } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import ManualAttendancePanel from '@/components/attendance/ManualAttendancePanel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function InstructorSessionLive() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: session, isLoading } = useSession(id);
  const { data: attendance } = useSessionAttendance(id);
  const { data: enrolledCount } = useEnrolledCount(session?.course_id);
  const deleteAttendance = useDeleteAttendance();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const attendedCount = attendance?.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length || 0;
  const attendanceRate = enrolledCount ? Math.round((attendedCount / enrolledCount) * 100) : 0;

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

  const isActive = session.status === 'active';

  return (
    <DashboardLayout>
      <PageHeader 
        title={t('session.live_title')}
        actions={
          <Button variant="outline" onClick={() => navigate(`/instructor/sessions/${id}`)}>
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('cancel')}
          </Button>
        }
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {session.courses?.code} - {session.courses?.name}
          </h2>
          <p className="text-muted-foreground">{t('session.live_subtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t('session.enrolled')} value={enrolledCount || 0} icon={Users} />
          <StatCard title={t('session.attended')} value={attendedCount} icon={UserCheck} />
          <StatCard title={t('session.attendance_rate')} value={`${attendanceRate}%`} icon={TrendingUp} />
        </div>

        {/* Attendance Tabs */}
        <Tabs defaultValue="qr">
          <TabsList>
            <TabsTrigger value="qr">{t('manual.tab_all')}</TabsTrigger>
            {isActive && <TabsTrigger value="manual">{t('manual.tab_manual')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="qr">
            <Card>
              <CardHeader>
                <CardTitle>{t('student.history')}</CardTitle>
                <CardDescription>{t('session.live_subtitle')}</CardDescription>
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
                        <TableHead className="text-end">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.profiles?.full_name}</TableCell>
                          <TableCell>{record.profiles?.student_code}</TableCell>
                          <TableCell>{format(new Date(record.scanned_at), 'HH:mm:ss')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AttendanceStatusBadge status={record.attendance_status} />
                              <Badge variant="outline" className="text-xs">
                                {record.attendance_source === 'manual' ? t('manual.source_manual') : t('manual.source_qr')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ id: record.id, name: record.profiles?.full_name || '' })}
                              disabled={deleteAttendance.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isActive && (
            <TabsContent value="manual">
              <Card>
                <CardHeader>
                  <CardTitle>{t('manual.tab_manual')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ManualAttendancePanel
                    sessionId={session.id}
                    courseId={session.course_id}
                    existingAttendance={attendance || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove attendance record"
        description={deleteTarget ? `Remove attendance for ${deleteTarget.name}? This action cannot be undone.` : ''}
        onConfirm={() => {
          if (deleteTarget && id) {
            deleteAttendance.mutate({ id: deleteTarget.id, session_id: id });
            setDeleteTarget(null);
          }
        }}
      />
    </DashboardLayout>
  );
}
