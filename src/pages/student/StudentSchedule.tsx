import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useStudentSchedule } from '@/hooks/useStudentData';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { useActiveDays } from '@/hooks/useActiveDays';
import { CalendarDays, Clock } from 'lucide-react';

const courseColors = [
  'bg-primary/15 border-primary/40 text-primary',
  'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300',
  'bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300',
  'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
  'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300',
];

export default function StudentSchedule() {
  const { t } = useI18n();
  const { data: schedules = [], isLoading } = useStudentSchedule();
  const { data: timeSlots = [], isLoading: slotsLoading } = useTimeSlots();
  const { data: activeDaysData = [], isLoading: daysLoading } = useActiveDays();

  const dayName = (d: number) => t(`crud.day_${d}` as Parameters<typeof t>[0]);

  const activeDays = useMemo(() => {
    return [...activeDaysData].filter(d => d.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }, [activeDaysData]);

  const courseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    schedules.forEach(s => {
      if (!map[s.course_id]) {
        map[s.course_id] = courseColors[idx % courseColors.length];
        idx++;
      }
    });
    return map;
  }, [schedules]);

  const schedulesByDay = useMemo(() => {
    const map: Record<number, typeof schedules> = {};
    schedules.forEach(s => {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    });
    return map;
  }, [schedules]);

  const getSchedulesForCell = (day: number, slotStart: string, slotEnd: string) => {
    const daySchedules = schedulesByDay[day] || [];
    return daySchedules.filter(s => s.start_time < slotEnd && s.end_time > slotStart);
  };

  const formatTime = (time: string) => time?.slice(0, 5) || time;

  const loading = isLoading || slotsLoading || daysLoading;

  return (
    <DashboardLayout>
      <PageHeader title={t('student.schedule')} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : timeSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('schedule.no_time_slots')}</p>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <EmptyState title={t('no_data')} icon={CalendarDays} />
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="border border-border bg-muted p-2 text-sm font-semibold text-muted-foreground min-w-[100px]">
                  {t('schedule.time_day')}
                </th>
                {activeDays.map(day => (
                  <th key={day.day_of_week} className="border border-border bg-muted p-2 text-center text-sm font-semibold min-w-[140px]">
                    {dayName(day.day_of_week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot.id}>
                  <td className="border border-border bg-muted/50 p-2 text-center text-xs font-medium whitespace-nowrap">
                    <div className="font-semibold">{slot.label}</div>
                    <div className="text-muted-foreground mt-0.5" dir="ltr">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </div>
                  </td>
                  {activeDays.map(day => {
                    const cellSchedules = getSchedulesForCell(day.day_of_week, slot.start_time, slot.end_time);
                    return (
                      <td key={day.day_of_week} className="border border-border p-1 align-top min-h-[60px] hover:bg-muted/30 transition-colors">
                        {cellSchedules.length === 0 ? (
                          <div className="h-14" />
                        ) : (
                          <div className="space-y-1">
                            {cellSchedules.map(s => (
                              <div
                                key={s.id}
                                className={`rounded-md border-s-4 p-1.5 text-xs ${courseColorMap[s.course_id] || 'bg-muted'}`}
                              >
                                <p className="font-bold truncate">{s.course?.code}</p>
                                <p className="truncate">{s.course?.name}</p>
                                {s.instructorName && <p className="text-[10px] opacity-75 truncate">{s.instructorName}</p>}
                                <p className="text-[10px] opacity-75 truncate">
                                  {s.classroom?.name} {s.classroom?.building ? `(${s.classroom.building})` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
