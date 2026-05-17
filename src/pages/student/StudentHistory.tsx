import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { useStudentAttendanceHistory } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import { History } from 'lucide-react';

export default function StudentHistory() {
  const { t } = useI18n();
  const { data: history, isLoading } = useStudentAttendanceHistory();

  return (
    <DashboardLayout>
      <PageHeader title={t('history.title')} />

      {isLoading ? (
        <div className="text-center py-8">{t('loading')}</div>
      ) : !history || history.length === 0 ? (
        <EmptyState 
          title={t('history.no_records')} 
          icon={History}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('history.course')}</TableHead>
                  <TableHead>{t('history.date')}</TableHead>
                  <TableHead>{t('history.time')}</TableHead>
                  <TableHead>{t('history.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.lecture_sessions?.courses?.code} - {record.lecture_sessions?.courses?.name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.lecture_sessions?.session_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.scanned_at), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={record.attendance_status} />
                    </TableCell>
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
