import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import { useSchedulesWithDetails, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '@/hooks/useSchedules';
import { useCourses } from '@/hooks/useCourses';
import { useClassrooms } from '@/hooks/useClassrooms';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { useTimeSlots, useCreateTimeSlot, useUpdateTimeSlot, useDeleteTimeSlot } from '@/hooks/useTimeSlots';
import { useActiveDays, useToggleActiveDay } from '@/hooks/useActiveDays';
import { useAcademicTerms } from '@/hooks/useAcademicTerms';
import { useTermContext } from '@/lib/termContext';
import { Plus, Pencil, Trash2, Clock, CalendarDays, Settings2, Table as TableIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Tables } from '@/integrations/supabase/types';

type ScheduleRow = {
  id: string;
  course_id: string;
  classroom_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course: { id: string; name: string; code: string } | null;
  classroom: { id: string; name: string; building: string } | null;
};

type TimeSlot = Tables<'time_slots'>;
type ActiveDay = Tables<'active_days'>;

const ALL_DAYS = [6, 0, 1, 2, 3, 4, 5]; // Sat, Sun, Mon, Tue, Wed, Thu, Fri

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

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        <Button variant="outline" size="sm" onClick={onRetry} className="ms-4">
          <RefreshCw className="h-3.5 w-3.5 me-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function AdminSchedules() {
  const { t, dir } = useI18n();
  const { activeTermId } = useTermContext();
  const { data: terms = [] } = useAcademicTerms();
  const [filterTermId, setFilterTermId] = useState<string>('all');
  const effectiveTermId = filterTermId === 'all' ? null : filterTermId === 'unassigned' ? null : filterTermId;
  const onlyUnassigned = filterTermId === 'unassigned';
  const schedulesQuery = useSchedulesWithDetails(effectiveTermId);
  const allSchedules = schedulesQuery.data || [];
  const schedules = onlyUnassigned ? allSchedules.filter((s: any) => !s.term_id) : allSchedules;
  const isLoading = schedulesQuery.isLoading;
  const { data: courses = [] } = useCourses();
  const { data: classrooms = [] } = useClassrooms();
  const { data: instructors = [] } = useProfilesByRole('instructor');
  const timeSlotsQuery = useTimeSlots();
  const { data: timeSlots = [], isLoading: timeSlotsLoading } = timeSlotsQuery;
  const activeDaysQuery = useActiveDays();
  const { data: activeDaysData = [], isLoading: daysLoading } = activeDaysQuery;
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();
  const createSlotMutation = useCreateTimeSlot();
  const updateSlotMutation = useUpdateTimeSlot();
  const deleteSlotMutation = useDeleteTimeSlot();
  const toggleDayMutation = useToggleActiveDay();

  const [activeTab, setActiveTab] = useState('timetable');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRow | null>(null);
  const [form, setForm] = useState({ course_id: '', classroom_id: '', day_of_week: 0, time_slot_id: '', term_id: '' });

  // Time slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<TimeSlot | null>(null);
  const [slotForm, setSlotForm] = useState({ label: '', start_time: '08:00', end_time: '08:50', sort_order: 0 });

  const dayName = (d: number) => {
    const key = `crud.day_${d}` as keyof ReturnType<typeof t extends (k: infer K) => string ? () => K : never>;
    return t(`crud.day_${d}` as Parameters<typeof t>[0]);
  };

  const activeDays = useMemo(() => {
    return [...activeDaysData].filter((d) => d.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }, [activeDaysData]);

  const activeDayNumbers = useMemo(() => activeDays.map((d) => d.day_of_week), [activeDays]);

  const sortedActiveDaysData = useMemo(() => {
    return [...activeDaysData].sort((a, b) => a.sort_order - b.sort_order);
  }, [activeDaysData]);

  // Build instructor map for display
  const instructorMap = useMemo(() => {
    const map: Record<string, string> = {};
    instructors.forEach((i) => { map[i.id] = i.full_name; });
    return map;
  }, [instructors]);

  // Color map for courses (memoized)
  const courseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let colorIdx = 0;
    (schedules as ScheduleRow[]).forEach(s => {
      if (!map[s.course_id]) {
        map[s.course_id] = courseColors[colorIdx % courseColors.length];
        colorIdx++;
      }
    });
    return map;
  }, [schedules]);

  // Pre-index schedules by day for O(1) lookup per cell
  const schedulesByDay = useMemo(() => {
    const map: Record<number, ScheduleRow[]> = {};
    (schedules as ScheduleRow[]).forEach(s => {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    });
    return map;
  }, [schedules]);

  // Schedule CRUD
  const openCreate = () => {
    setEditing(null);
    setForm({ course_id: '', classroom_id: '', day_of_week: activeDayNumbers[0] ?? 0, time_slot_id: '', term_id: activeTermId ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (s: ScheduleRow) => {
    setEditing(s);
    // Find matching time slot by start/end time for legacy schedules
    const matchedSlot = timeSlots.find(ts => ts.start_time === s.start_time && ts.end_time === s.end_time);
    setForm({ course_id: s.course_id, classroom_id: s.classroom_id, day_of_week: s.day_of_week, time_slot_id: matchedSlot?.id ?? '', term_id: (s as any).term_id ?? '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const selectedSlot = timeSlots.find(ts => ts.id === form.time_slot_id);
    if (!selectedSlot) return;
    const payload = {
      course_id: form.course_id,
      classroom_id: form.classroom_id,
      day_of_week: form.day_of_week,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      term_id: form.term_id || null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('save'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('add'));
      }
      setDialogOpen(false);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteMutation.mutateAsync(deleteTarget.id); toast.success(t('delete')); setDeleteTarget(null); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  // Time slot CRUD
  const openCreateSlot = () => {
    setEditingSlot(null);
    setSlotForm({ label: '', start_time: '08:00', end_time: '08:50', sort_order: timeSlots.length });
    setSlotDialogOpen(true);
  };

  const openEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setSlotForm({ label: slot.label, start_time: slot.start_time, end_time: slot.end_time, sort_order: slot.sort_order });
    setSlotDialogOpen(true);
  };

  const handleSlotSubmit = async () => {
    try {
      if (editingSlot) {
        await updateSlotMutation.mutateAsync({ id: editingSlot.id, ...slotForm });
      } else {
        await createSlotMutation.mutateAsync(slotForm);
      }
      toast.success(t('save'));
      setSlotDialogOpen(false);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleSlotDelete = async () => {
    if (!deleteSlotTarget) return;
    try { await deleteSlotMutation.mutateAsync(deleteSlotTarget.id); toast.success(t('delete')); setDeleteSlotTarget(null); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const handleToggleDay = async (day: ActiveDay) => {
    try {
      await toggleDayMutation.mutateAsync({ id: day.id, is_active: !day.is_active });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  // Helper: find schedules matching a day and overlapping a time slot (uses pre-indexed map)
  const getSchedulesForCell = (dayOfWeek: number, slotStart: string, slotEnd: string) => {
    const daySchedules = schedulesByDay[dayOfWeek] || [];
    return daySchedules.filter(s => s.start_time < slotEnd && s.end_time > slotStart);
  };

  const columns: Column<ScheduleRow>[] = [
    { key: 'course', header: t('crud.course'), sortable: true, render: (row) => row.course ? `${row.course.code} - ${row.course.name}` : '-' },
    { key: 'classroom', header: t('crud.classroom'), render: (row) => row.classroom ? `${row.classroom.name} (${row.classroom.building})` : '-' },
    { key: 'day_of_week', header: t('crud.day'), sortable: true, render: (row) => dayName(row.day_of_week) },
    { key: 'start_time', header: t('crud.start_time') },
    { key: 'end_time', header: t('crud.end_time') },
    {
      key: 'actions', header: t('actions'), render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">···</Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4 me-2" />{t('edit')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4 me-2" />{t('delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  const formatTime = (time: string) => time?.slice(0, 5) || time;

  const hasError = schedulesQuery.isError || timeSlotsQuery.isError || activeDaysQuery.isError;

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.schedules')} actions={<Button onClick={openCreate}><Plus className="h-4 w-4 me-2" />{t('crud.add_schedule')}</Button>} />

      {terms.length > 0 && (
        <div className="mb-4 flex items-center gap-2 max-w-xs">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('term.filter')}:</Label>
          <Select value={filterTermId} onValueChange={setFilterTermId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('term.all')}</SelectItem>
              {terms.map(term => (
                <SelectItem key={term.id} value={term.id}>{term.name}{term.is_active ? ' ●' : ''}</SelectItem>
              ))}
              <SelectItem value="unassigned">{t('term.unassigned')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {hasError && (
        <ErrorRetry
          message={t('schedule.error_loading')}
          onRetry={() => {
            if (schedulesQuery.isError) schedulesQuery.refetch();
            if (timeSlotsQuery.isError) timeSlotsQuery.refetch();
            if (activeDaysQuery.isError) activeDaysQuery.refetch();
          }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="timetable"><CalendarDays className="h-4 w-4 me-2" />{t('schedule.timetable_view')}</TabsTrigger>
          <TabsTrigger value="table"><TableIcon className="h-4 w-4 me-2" />{t('crud.table_view')}</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="h-4 w-4 me-2" />{t('schedule.settings')}</TabsTrigger>
        </TabsList>

        {/* ===== TIMETABLE VIEW ===== */}
        <TabsContent value="timetable">
          {(timeSlotsLoading || daysLoading || isLoading) ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : timeSlots.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('schedule.no_time_slots')}</p>
                <Button className="mt-4" onClick={() => setActiveTab('settings')}>
                  {t('schedule.manage_time_slots')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="border border-border bg-muted p-2 text-sm font-semibold text-muted-foreground min-w-[100px]">
                      {t('schedule.time_day')}
                    </th>
                    {activeDays.map((day) => (
                      <th key={day.day_of_week} className="border border-border bg-muted p-2 text-center text-sm font-semibold min-w-[140px]">
                        {dayName(day.day_of_week)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="border border-border bg-muted/50 p-2 text-center text-xs font-medium whitespace-nowrap">
                        <div className="font-semibold">{slot.label}</div>
                        <div className="text-muted-foreground mt-0.5" dir="ltr">
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </div>
                      </td>
                      {activeDays.map((day) => {
                        const cellSchedules = getSchedulesForCell(day.day_of_week, slot.start_time, slot.end_time);
                        return (
                          <td key={day.day_of_week} className="border border-border p-1 align-top min-h-[60px] hover:bg-muted/30 transition-colors">
                            {cellSchedules.length === 0 ? (
                              <div className="h-14" />
                            ) : (
                              <div className="space-y-1">
                                {cellSchedules.map(s => {
                                  const course = courses.find(c => c.id === s.course_id);
                                  const instrName = course?.instructor_id ? instructorMap[course.instructor_id] : null;
                                  return (
                                    <div
                                      key={s.id}
                                      className={`rounded-md border-s-4 p-1.5 text-xs cursor-pointer transition-shadow hover:shadow-md ${courseColorMap[s.course_id] || 'bg-muted'}`}
                                      onClick={() => openEdit(s)}
                                    >
                                      <p className="font-bold truncate">{s.course?.code}</p>
                                      <p className="truncate">{s.course?.name}</p>
                                      {instrName && <p className="text-[10px] opacity-75 truncate">{instrName}</p>}
                                      <p className="text-[10px] opacity-75 truncate">{s.classroom?.name} {s.classroom?.building ? `(${s.classroom.building})` : ''}</p>
                                    </div>
                                  );
                                })}
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
        </TabsContent>

        {/* ===== TABLE VIEW ===== */}
        <TabsContent value="table">
          <DataTable columns={columns} data={schedules as ScheduleRow[]} isLoading={isLoading} searchKeys={['course', 'classroom']} />
        </TabsContent>

        {/* ===== SETTINGS VIEW ===== */}
        <TabsContent value="settings">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Active Days */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" />
                  {t('schedule.active_days')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {daysLoading ? (
                  <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {sortedActiveDaysData.map((day) => (
                      <div key={day.id} className="flex items-center justify-between py-2 px-3 rounded-md border border-border">
                        <span className="text-sm font-medium">{dayName(day.day_of_week)}</span>
                        <Switch
                          checked={day.is_active}
                          onCheckedChange={() => handleToggleDay(day)}
                          disabled={toggleDayMutation.isPending}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    {t('schedule.time_slots')}
                  </span>
                  <Button size="sm" onClick={openCreateSlot}><Plus className="h-4 w-4 me-1" />{t('add')}</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeSlotsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('schedule.no_time_slots')}</p>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map((slot, idx) => (
                      <div key={slot.id} className="flex items-center justify-between py-2 px-3 rounded-md border border-border">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                          <div>
                            <span className="text-sm font-medium">{slot.label}</span>
                            <span className="text-xs text-muted-foreground ms-2" dir="ltr">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSlot(slot)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteSlotTarget(slot)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('crud.edit_schedule') : t('crud.add_schedule')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('crud.course')}</Label>
              <Select value={form.course_id} onValueChange={v => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('crud.select_course')} /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('crud.classroom')}</Label>
              <Select value={form.classroom_id} onValueChange={v => setForm({ ...form, classroom_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('crud.select_classroom')} /></SelectTrigger>
                <SelectContent>{classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.building})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('crud.day')}</Label>
              <Select value={String(form.day_of_week)} onValueChange={v => setForm({ ...form, day_of_week: +v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_DAYS.map(d => <SelectItem key={d} value={String(d)}>{dayName(d)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('schedule.period')}</Label>
              <Select value={form.time_slot_id} onValueChange={v => setForm({ ...form, time_slot_id: v })}>
                <SelectTrigger><SelectValue placeholder={t('schedule.select_period')} /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map(slot => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.label} ({formatTime(slot.start_time)} – {formatTime(slot.end_time)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {terms.length > 0 && (
              <div className="grid gap-2">
                <Label>{t('admin.terms')}</Label>
                <Select value={form.term_id} onValueChange={v => setForm({ ...form, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('term.select')} /></SelectTrigger>
                  <SelectContent>
                    {terms.map(term => (
                      <SelectItem key={term.id} value={term.id}>{term.name}{term.is_active ? ' ●' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.course_id || !form.classroom_id || !form.time_slot_id}>{editing ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Slot Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingSlot ? t('schedule.edit_time_slot') : t('schedule.add_time_slot')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('schedule.slot_label')}</Label>
              <Input value={slotForm.label} onChange={e => setSlotForm({ ...slotForm, label: e.target.value })} placeholder={t('schedule.slot_label_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('crud.start_time')}</Label><Input type="time" value={slotForm.start_time} onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('crud.end_time')}</Label><Input type="time" value={slotForm.end_time} onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })} /></div>
            </div>
            <div className="grid gap-2">
              <Label>{t('schedule.sort_order')}</Label>
              <Input type="number" min={0} value={slotForm.sort_order} onChange={e => setSlotForm({ ...slotForm, sort_order: +e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSlotSubmit} disabled={!slotForm.label}>{editingSlot ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title={t('crud.confirm_delete')} description={t('crud.confirm_delete_desc')} onConfirm={handleDelete} />
      <ConfirmDialog open={!!deleteSlotTarget} onOpenChange={() => setDeleteSlotTarget(null)} title={t('crud.confirm_delete')} description={t('crud.confirm_delete_desc')} onConfirm={handleSlotDelete} />
    </DashboardLayout>
  );
}
