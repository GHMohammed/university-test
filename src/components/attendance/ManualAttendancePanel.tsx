import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { useEnrollmentsByCourse } from '@/hooks/useEnrollments';
import { useManualAttendance, AttendanceWithStudent } from '@/hooks/useAttendance';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  sessionId: string;
  courseId: string;
  existingAttendance: AttendanceWithStudent[];
}

const PAGE_SIZE = 20;

export default function ManualAttendancePanel({ sessionId, courseId, existingAttendance }: Props) {
  const { t, dir } = useI18n();
  const { data: enrollments, isLoading } = useEnrollmentsByCourse(courseId);
  const manualAttendance = useManualAttendance();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceWithStudent>();
    existingAttendance.forEach(r => map.set(r.student_id, r));
    return map;
  }, [existingAttendance]);

  const filtered = useMemo(() => {
    if (!enrollments) return [];
    const q = search.toLowerCase();
    return enrollments.filter(e => {
      if (!e.student) return false;
      return (
        e.student.full_name?.toLowerCase().includes(q) ||
        e.student.student_code?.toLowerCase().includes(q)
      );
    });
  }, [enrollments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleMark = (studentId: string, status: 'present' | 'absent') => {
    manualAttendance.mutate(
      { session_id: sessionId, student_id: studentId, attendance_status: status },
      {
        onSuccess: () => toast.success(t('manual.success')),
        onError: (err: Error) => {
          if (err.message === 'ALREADY_RECORDED') {
            toast.error(t('manual.already_recorded'));
          } else {
            toast.error(err.message);
          }
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('manual.search_students')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="ps-9"
        />
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('no_data')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('session.student_name')}</TableHead>
              <TableHead>{t('session.student_id_col')}</TableHead>
              <TableHead>{t('crud.status')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(enrollment => {
              const existing = attendanceMap.get(enrollment.student_id);
              return (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">{enrollment.student?.full_name}</TableCell>
                  <TableCell>{enrollment.student?.student_code}</TableCell>
                  <TableCell>
                    {existing ? (
                      <div className="flex items-center gap-2">
                        <AttendanceStatusBadge status={existing.attendance_status} />
                        <Badge variant="outline" className="text-xs">
                          {existing.attendance_source === 'manual' ? t('manual.source_manual') : t('manual.source_qr')}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {existing ? null : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={manualAttendance.isPending}
                          onClick={() => handleMark(enrollment.student_id, 'present')}
                        >
                          <UserCheck className="h-3.5 w-3.5 me-1" />
                          {t('manual.mark_present')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={manualAttendance.isPending}
                          onClick={() => handleMark(enrollment.student_id, 'absent')}
                        >
                          <UserX className="h-3.5 w-3.5 me-1" />
                          {t('manual.mark_absent')}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
