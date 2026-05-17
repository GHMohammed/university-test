import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHeadcountVerifications, useCreateHeadcountVerification } from '@/hooks/useHeadcount';
import { useSessionAttendance, useEnrolledCount } from '@/hooks/useAttendance';
import { format } from 'date-fns';

export default function InstructorHeadcount() {
  const { t } = useI18n();
  const { user } = useAuth();

  // Fetch instructor's active/closed sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['instructor-sessions-headcount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecture_sessions')
        .select('id, session_date, start_time, status, course_id, courses(id, name, code), classrooms(id, name, building)')
        .eq('instructor_id', user!.id)
        .in('status', ['active', 'closed'])
        .order('session_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const selectedSession = sessions?.find(s => s.id === selectedSessionId);

  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.headcount')} />

      <div className="space-y-6">
        {/* Session selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t('headcount.select_session' as any)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : !sessions?.length ? (
              <p className="text-sm text-muted-foreground">{t('no_data')}</p>
            ) : (
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('headcount.select_session' as any)} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {(s.courses as any)?.code} — {format(new Date(s.session_date), 'yyyy-MM-dd')} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedSession && (
          <HeadcountPanel session={selectedSession} />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Headcount Panel ─────────────────────────────────────────────────────────

function HeadcountPanel({ session }: { session: any }) {
  const { t } = useI18n();
  const [detectedCount, setDetectedCount] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: attendance } = useSessionAttendance(session.id);
  const { data: enrolledCount } = useEnrolledCount(session.course_id);
  const { data: verifications, isLoading: verificationsLoading } = useHeadcountVerifications(session.id);
  const createVerification = useCreateHeadcountVerification();

  const recordedAttendance = attendance?.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length || 0;
  const parsedDetected = parseInt(detectedCount, 10);
  const isValidInput = !isNaN(parsedDetected) && parsedDetected >= 0;
  const diff = isValidInput ? Math.abs(recordedAttendance - parsedDetected) : 0;
  const isMismatch = isValidInput && diff >= 3;

  const handleSubmit = () => {
    if (!isValidInput) return;
    createVerification.mutate({
      sessionId: session.id,
      expectedCount: recordedAttendance,
      detectedCount: parsedDetected,
      courseId: session.course_id,
      courseName: (session.courses as any)?.name || '',
    }, {
      onSuccess: () => {
        setDetectedCount('');
        setNotes('');
      },
    });
  };

  return (
    <>
      {/* Session info + stats */}
      <Card>
        <CardHeader>
          <CardTitle>{(session.courses as any)?.code} — {(session.courses as any)?.name}</CardTitle>
          <CardDescription>
            {format(new Date(session.session_date), 'yyyy-MM-dd')} · {(session.classrooms as any)?.name}, {(session.classrooms as any)?.building}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('session.enrolled')}</p>
                <p className="font-semibold">{enrolledCount ?? '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('headcount.recorded' as any)}</p>
                <p className="font-semibold">{recordedAttendance}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('headcount.threshold' as any)}</p>
                <p className="font-semibold">±3</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('headcount.enter_count' as any)}</CardTitle>
          <CardDescription>{t('headcount.enter_count_desc' as any)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t('headcount.physical_count' as any)}
              </label>
              <Input
                type="number"
                min={0}
                value={detectedCount}
                onChange={e => setDetectedCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {t('headcount.difference' as any)}
                </label>
                <div className="flex items-center gap-2 h-10">
                  {isValidInput ? (
                    <>
                      <span className="text-lg font-bold">{diff}</span>
                      {isMismatch ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('headcount.mismatch' as any)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('headcount.match' as any)}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t('headcount.notes' as any)}
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('headcount.notes_placeholder' as any)}
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValidInput || createVerification.isPending}
            className="w-full sm:w-auto"
          >
            {createVerification.isPending ? t('loading') : t('headcount.submit' as any)}
          </Button>
        </CardContent>
      </Card>

      {/* Past verifications */}
      <Card>
        <CardHeader>
          <CardTitle>{t('headcount.history' as any)}</CardTitle>
        </CardHeader>
        <CardContent>
          {verificationsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !verifications?.length ? (
            <p className="text-sm text-muted-foreground">{t('no_data')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('headcount.recorded' as any)}</TableHead>
                  <TableHead>{t('headcount.physical_count' as any)}</TableHead>
                  <TableHead>{t('headcount.difference' as any)}</TableHead>
                  <TableHead>{t('crud.status')}</TableHead>
                  <TableHead>{t('history.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{v.expected_count}</TableCell>
                    <TableCell>{v.detected_count}</TableCell>
                    <TableCell>{Math.abs(v.expected_count - v.detected_count)}</TableCell>
                    <TableCell>
                      {v.mismatch_flag ? (
                        <Badge variant="destructive">{t('headcount.mismatch' as any)}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('headcount.match' as any)}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(v.created_at), 'HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
