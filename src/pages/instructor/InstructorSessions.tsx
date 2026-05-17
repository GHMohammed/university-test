import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SessionStatusBadge } from '@/components/attendance/SessionStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, RotateCcw, QrCode, Radio, Calendar, Clock, History } from 'lucide-react';
import { useStartAttendanceFromSchedule, useUpdateSessionStatus } from '@/hooks/useSessions';
import { useInstructorSchedules, useInstructorSessions } from '@/hooks/useInstructorSchedules';
import { useState } from 'react';

export default function InstructorSessions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('today');

  const { data: schedules, isLoading: schedulesLoading } = useInstructorSchedules();
  const { data: pastSessions, isLoading: sessionsLoading } = useInstructorSessions();
  const startAttendance = useStartAttendanceFromSchedule();
  const updateStatusMutation = useUpdateSessionStatus();

  // Get today's day of week (JS: 0=Sun, we use same convention)
  const todayDow = new Date().getDay();

  // Unique courses from schedules
  const courses = useMemo(() => {
    if (!schedules) return [];
    const seen = new Map<string, { id: string; code: string; name: string }>();
    schedules.forEach(s => {
      if (s.course && !seen.has(s.course_id)) {
        seen.set(s.course_id, s.course);
      }
    });
    return Array.from(seen.values());
  }, [schedules]);

  // Filter schedules by course
  const filtered = useMemo(() => {
    if (!schedules) return [];
    return filterCourse === 'all' ? schedules : schedules.filter(s => s.course_id === filterCourse);
  }, [schedules, filterCourse]);

  // Separate today's lectures vs other days
  const todayLectures = useMemo(() => filtered.filter(s => s.day_of_week === todayDow), [filtered, todayDow]);
  const weekLectures = useMemo(() => filtered.filter(s => s.day_of_week !== todayDow), [filtered, todayDow]);

  // Past sessions (closed) for history
  const closedSessions = useMemo(() => {
    if (!pastSessions) return [];
    let result = pastSessions.filter((s: any) => s.status === 'closed');
    if (filterCourse !== 'all') {
      result = result.filter((s: any) => s.course_id === filterCourse);
    }
    return result;
  }, [pastSessions, filterCourse]);

  const dayName = (d: number) => t(`crud.day_${d}` as Parameters<typeof t>[0]);

  const isLoading = schedulesLoading || sessionsLoading;

  return (
    <DashboardLayout>
      <PageHeader title={t('session.title')} />

      <div className="mb-4 flex gap-2">
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('session.all_courses')}</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} - {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="today">
            <Clock className="h-4 w-4 me-2" />
            {t('session.today_lectures')}
          </TabsTrigger>
          <TabsTrigger value="week">
            <Calendar className="h-4 w-4 me-2" />
            {t('session.week_schedule')}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 me-2" />
            {t('session.history')}
          </TabsTrigger>
        </TabsList>

        {/* TODAY'S LECTURES */}
        <TabsContent value="today">
          {isLoading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : todayLectures.length === 0 ? (
            <EmptyState
              title={t('session.no_today_lectures')}
              description={t('session.no_today_lectures_desc')}
            />
          ) : (
            <div className="grid gap-4">
              {todayLectures.map((schedule) => (
                <LectureCard
                  key={schedule.id}
                  schedule={schedule}
                  dayName={dayName(schedule.day_of_week)}
                  isToday
                  onStartAttendance={() => startAttendance.mutate({
                    id: schedule.id,
                    course_id: schedule.course_id,
                    classroom_id: schedule.classroom_id,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time,
                  })}
                  onCloseSession={(sessionId) => updateStatusMutation.mutate({ id: sessionId, status: 'closed' })}
                  onReopenSession={(sessionId) => updateStatusMutation.mutate({ id: sessionId, status: 'active' })}
                  navigate={navigate}
                  t={t}
                  isPending={startAttendance.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* WEEK SCHEDULE */}
        <TabsContent value="week">
          {isLoading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : weekLectures.length === 0 ? (
            <EmptyState
              title={t('session.no_other_lectures')}
              description={t('session.no_other_lectures_desc')}
            />
          ) : (
            <div className="grid gap-4">
              {weekLectures.map((schedule) => (
                <LectureCard
                  key={schedule.id}
                  schedule={schedule}
                  dayName={dayName(schedule.day_of_week)}
                  isToday={false}
                  navigate={navigate}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          {sessionsLoading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : closedSessions.length === 0 ? (
            <EmptyState
              title={t('session.no_sessions')}
              description={t('session.no_history_desc')}
            />
          ) : (
            <div className="grid gap-4">
              {closedSessions.map((session: any) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {session.courses?.code} - {session.courses?.name}
                        </CardTitle>
                        <CardDescription>
                          {session.classrooms?.name} • {session.session_date} • {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </CardDescription>
                      </div>
                      <SessionStatusBadge status={session.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/instructor/sessions/${session.id}`)}>
                      {t('session.details')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

interface LectureCardProps {
  schedule: any;
  dayName: string;
  isToday: boolean;
  onStartAttendance?: () => void;
  onCloseSession?: (sessionId: string) => void;
  onReopenSession?: (sessionId: string) => void;
  navigate: (path: string) => void;
  t: (key: any) => string;
  isPending?: boolean;
}

function LectureCard({ schedule, dayName, isToday, onStartAttendance, onCloseSession, onReopenSession, navigate, t, isPending }: LectureCardProps) {
  const session = schedule.activeSession;
  const hasActiveSession = session?.status === 'active';
  const hasClosedSession = session?.status === 'closed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {schedule.course?.code} - {schedule.course?.name}
            </CardTitle>
            <CardDescription>
              {schedule.classroom?.name} ({schedule.classroom?.building}) • {dayName} • {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveSession && <SessionStatusBadge status="active" />}
            {hasClosedSession && <SessionStatusBadge status="closed" />}
            {!session && isToday && <Badge variant="outline">{t('session.ready')}</Badge>}
            {!isToday && <Badge variant="secondary">{dayName}</Badge>}
          </div>
        </div>
      </CardHeader>
      {isToday && (
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {/* No session yet - can start */}
            {!session && onStartAttendance && (
              <ConfirmDialog
                title={t('session.confirm_start')}
                description={t('session.confirm_start_desc')}
                onConfirm={onStartAttendance}
              >
                <Button size="sm" disabled={isPending}>
                  <Play className="h-3 w-3 me-2" />
                  {t('session.start_attendance')}
                </Button>
              </ConfirmDialog>
            )}

            {/* Active session - can close, view QR, view live */}
            {hasActiveSession && (
              <>
                {onCloseSession && (
                  <ConfirmDialog
                    title={t('session.confirm_close')}
                    description={t('session.confirm_close_desc')}
                    onConfirm={() => onCloseSession(session.id)}
                  >
                    <Button size="sm" variant="destructive">
                      <Square className="h-3 w-3 me-2" />
                      {t('session.close_session')}
                    </Button>
                  </ConfirmDialog>
                )}

                <Button size="sm" variant="outline" onClick={() => navigate(`/instructor/sessions/${session.id}/qr`)}>
                  <QrCode className="h-3 w-3 me-2" />
                  {t('session.view_qr')}
                </Button>

                <Button size="sm" variant="outline" onClick={() => navigate(`/instructor/sessions/${session.id}/live`)}>
                  <Radio className="h-3 w-3 me-2" />
                  {t('session.view_live')}
                </Button>

                <Button size="sm" variant="ghost" onClick={() => navigate(`/instructor/sessions/${session.id}`)}>
                  {t('session.details')}
                </Button>
              </>
            )}

            {/* Closed session - can reopen or view details */}
            {hasClosedSession && (
              <>
                {onReopenSession && (
                  <ConfirmDialog
                    title={t('session.confirm_reopen')}
                    description={t('session.confirm_reopen_desc')}
                    onConfirm={() => onReopenSession(session.id)}
                  >
                    <Button size="sm" variant="outline">
                      <RotateCcw className="h-3 w-3 me-2" />
                      {t('session.reopen_session')}
                    </Button>
                  </ConfirmDialog>
                )}

                <Button size="sm" variant="ghost" onClick={() => navigate(`/instructor/sessions/${session.id}`)}>
                  {t('session.details')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
