import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollmentsByCourse, useCreateEnrollments, useDeleteEnrollment } from '@/hooks/useEnrollments';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { BulkEnrollImport } from '@/components/enrollments/BulkEnrollImport';
import { useAcademicTerms } from '@/hooks/useAcademicTerms';
import { useTermContext } from '@/lib/termContext';

type EnrollmentRow = { id: string; student_id: string; course_id: string; enrolled_at: string; student: { id: string; full_name: string; email: string; student_code: string | null; department: string | null } | null };

export default function AdminEnrollments() {
  const { t } = useI18n();
  const { activeTermId } = useTermContext();
  const { data: terms = [] } = useAcademicTerms();
  const [filterTermId, setFilterTermId] = useState<string>(activeTermId ?? 'all');
  const effectiveTermId = filterTermId === 'all' ? null : filterTermId;
  const { data: courses = [] } = useCourses();
  const { data: allStudents = [] } = useProfilesByRole('student');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const { data: enrollments = [], isLoading } = useEnrollmentsByCourse(selectedCourse, effectiveTermId);
  const createMutation = useCreateEnrollments();
  const deleteMutation = useDeleteEnrollment();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentRow | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const enrolledIds = new Set(enrollments.map((e: any) => e.student_id));
  const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));
  const filteredAvailable = studentSearch
    ? availableStudents.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.student_code || '').toLowerCase().includes(studentSearch.toLowerCase()))
    : availableStudents;

  const handleAdd = async () => {
    if (!selectedCourse || selectedStudents.length === 0) return;
    try {
      await createMutation.mutateAsync({ course_id: selectedCourse, student_ids: selectedStudents, term_id: effectiveTermId });
      toast.success(t('crud.enrolled_success'));
      setAddDialogOpen(false);
      setSelectedStudents([]);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteMutation.mutateAsync(deleteTarget.id); toast.success(t('delete')); setDeleteTarget(null); } catch (e: any) { toast.error(e.message); }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const columns: Column<EnrollmentRow>[] = [
    { key: 'student_name', header: t('crud.full_name'), sortable: true, render: (row) => row.student?.full_name || '-' },
    { key: 'student_email', header: t('email'), render: (row) => row.student?.email || '-' },
    { key: 'student_code', header: t('crud.student_code'), render: (row) => row.student?.student_code || '-' },
    { key: 'enrolled_at', header: t('crud.enrolled_at'), render: (row) => new Date(row.enrolled_at).toLocaleDateString() },
    { key: 'actions', header: t('actions'), render: (row) => (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></Button>
    )},
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.enrollments')} />
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="max-w-sm flex-1 min-w-[220px]">
          <Label className="mb-2 block">{t('crud.select_course')}</Label>
          <Select value={selectedCourse || ''} onValueChange={v => setSelectedCourse(v)}>
            <SelectTrigger><SelectValue placeholder={t('crud.select_course')} /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {terms.length > 0 && (
          <div className="max-w-xs flex-1 min-w-[200px]">
            <Label className="mb-2 block">{t('term.filter')}</Label>
            <Select value={filterTermId} onValueChange={setFilterTermId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('term.all')}</SelectItem>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>{term.name}{term.is_active ? ' ●' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedCourse ? (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setAddDialogOpen(true); setSelectedStudents([]); setStudentSearch(''); }}><Plus className="h-4 w-4 me-2" />{t('crud.enroll_students')}</Button>
          </div>
          <div className="mb-6">
            <BulkEnrollImport courseId={selectedCourse} allStudents={allStudents} enrolledStudentIds={enrolledIds} termId={effectiveTermId} />
          </div>
          <DataTable columns={columns} data={enrollments as EnrollmentRow[]} isLoading={isLoading} searchKeys={['student_name']} emptyTitle={t('crud.no_enrollments')} />
        </>
      ) : (
        <EmptyState title={t('crud.select_course_first')} />
      )}

      {/* Add students dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>{t('crud.enroll_students')}</DialogTitle></DialogHeader>
          <Input placeholder={t('search')} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="mb-2" />
          <div className="flex-1 overflow-auto space-y-1 min-h-0">
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">{t('crud.no_available_students')}</p>
            ) : (
              filteredAvailable.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <Checkbox checked={selectedStudents.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.student_code || s.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">{t('crud.selected')}: {selectedStudents.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleAdd} disabled={selectedStudents.length === 0}>{t('crud.enroll_students')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title={t('crud.confirm_unenroll')} description={deleteTarget?.student?.full_name || ''} onConfirm={handleDelete} />
    </DashboardLayout>
  );
}
