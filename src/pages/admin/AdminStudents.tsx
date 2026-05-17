import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { useProfilesByRole, useCreateUser, useUpdateProfile } from '@/hooks/useProfiles';
import { Plus, Pencil, UserX, UserCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BulkStudentImport } from '@/components/students/BulkStudentImport';

type StudentRow = { id: string; full_name: string; email: string; phone: string | null; student_code: string | null; department: string | null; status: string; created_at: string };

export default function AdminStudents() {
  const { t } = useI18n();
  const { data = [], isLoading } = useProfilesByRole('student');
  const createMutation = useCreateUser();
  const updateMutation = useUpdateProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<StudentRow | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', student_code: '', department: '' });

  const openCreate = () => { setEditing(null); setForm({ email: '', password: '', full_name: '', phone: '', student_code: '', department: '' }); setDialogOpen(true); };
  const openEdit = (s: StudentRow) => { setEditing(s); setForm({ email: s.email, password: '', full_name: s.full_name, phone: s.phone || '', student_code: s.student_code || '', department: s.department || '' }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, full_name: form.full_name, phone: form.phone || null, student_code: form.student_code || null, department: form.department || null });
        toast.success(t('save'));
      } else {
        await createMutation.mutateAsync({ ...form, role: 'student' });
        toast.success(t('crud.user_created'));
      }
      setDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const newStatus = statusTarget.status === 'active' ? 'suspended' : 'active';
    try {
      await updateMutation.mutateAsync({ id: statusTarget.id, status: newStatus });
      toast.success(t('save'));
      setStatusTarget(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const columns: Column<StudentRow>[] = [
    { key: 'full_name', header: t('crud.full_name'), sortable: true },
    { key: 'email', header: t('email'), sortable: true },
    { key: 'phone', header: t('crud.phone') },
    { key: 'student_code', header: t('crud.student_code'), sortable: true },
    { key: 'department', header: t('crud.department'), sortable: true },
    { key: 'status', header: t('crud.status'), render: (row) => (
      <Badge variant={row.status === 'active' ? 'default' : 'destructive'}>{row.status === 'active' ? t('crud.active') : t('crud.suspended')}</Badge>
    )},
    { key: 'actions', header: t('actions'), render: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">···</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4 me-2" />{t('edit')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusTarget(row)}>
            {row.status === 'active' ? <><UserX className="h-4 w-4 me-2" />{t('crud.deactivate')}</> : <><UserCheck className="h-4 w-4 me-2" />{t('crud.activate')}</>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.students')} actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(!showBulkImport)}>
            <Upload className="h-4 w-4 me-2" />{t('bulk_students.title')}
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 me-2" />{t('crud.add_student')}</Button>
        </div>
      } />
      {showBulkImport && (
        <div className="mb-6">
          <BulkStudentImport />
        </div>
      )}
      <DataTable columns={columns} data={data as StudentRow[]} isLoading={isLoading} searchKeys={['full_name', 'email', 'student_code']} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('crud.edit_student') : t('crud.add_student')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('crud.full_name')}</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('email')}</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></div>
              {!editing && <div className="grid gap-2"><Label>{t('password')}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('crud.phone')}</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('crud.student_code')}</Label><Input value={form.student_code} onChange={e => setForm({ ...form, student_code: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>{t('crud.department')}</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.full_name || (!editing && (!form.email || !form.password))}>{editing ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={() => setStatusTarget(null)}
        title={statusTarget?.status === 'active' ? t('crud.confirm_deactivate') : t('crud.confirm_activate')}
        description={statusTarget?.full_name || ''}
        confirmLabel={statusTarget?.status === 'active' ? t('crud.deactivate') : t('crud.activate')}
        onConfirm={handleToggleStatus}
        variant={statusTarget?.status === 'active' ? 'destructive' : 'default'}
      />
    </DashboardLayout>
  );
}
