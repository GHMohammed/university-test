import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { useCoursesWithInstructor, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks/useCourses';
import { useProfilesByRole } from '@/hooks/useProfiles';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BulkCourseImport } from '@/components/courses/BulkCourseImport';

type CourseRow = { id: string; name: string; code: string; department: string | null; description: string | null; instructor_id: string | null; instructor_name: string; created_at: string };

export default function AdminCourses() {
  const { t } = useI18n();
  const { data = [], isLoading } = useCoursesWithInstructor();
  const { data: instructors = [] } = useProfilesByRole('instructor');
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const deleteMutation = useDeleteCourse();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', department: '', description: '', instructor_id: '' });

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', department: '', description: '', instructor_id: '' }); setDialogOpen(true); };
  const openEdit = (c: CourseRow) => { setEditing(c); setForm({ name: c.name, code: c.code, department: c.department || '', description: c.description || '', instructor_id: c.instructor_id || '' }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      const payload = { name: form.name, code: form.code, department: form.department || null, description: form.description || null, instructor_id: form.instructor_id || null };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('save'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('add'));
      }
      setDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteMutation.mutateAsync(deleteTarget.id); toast.success(t('delete')); setDeleteTarget(null); } catch (e: any) { toast.error(e.message); }
  };

  const columns: Column<CourseRow>[] = [
    { key: 'code', header: t('crud.course_code'), sortable: true },
    { key: 'name', header: t('crud.name'), sortable: true },
    { key: 'department', header: t('crud.department'), sortable: true },
    { key: 'instructor_name', header: t('crud.instructor'), sortable: true },
    { key: 'actions', header: t('actions'), render: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">···</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4 me-2" />{t('edit')}</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4 me-2" />{t('delete')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.courses')} actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(!showBulkImport)}>
            <Upload className="h-4 w-4 me-2" />{t('bulk_courses.title')}
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 me-2" />{t('crud.add_course')}</Button>
        </div>
      } />
      {showBulkImport && (
        <div className="mb-6">
          <BulkCourseImport />
        </div>
      )}
      <DataTable columns={columns} data={data as CourseRow[]} isLoading={isLoading} searchKeys={['name', 'code', 'department']} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('crud.edit_course') : t('crud.add_course')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('crud.name')}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('crud.course_code')}</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>{t('crud.department')}</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>{t('crud.instructor')}</Label>
              <Select value={form.instructor_id} onValueChange={v => setForm({ ...form, instructor_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={t('crud.select_instructor')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>{t('crud.description')}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.code}>{editing ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title={t('crud.confirm_delete')} description={t('crud.confirm_delete_desc')} onConfirm={handleDelete} />
    </DashboardLayout>
  );
}
