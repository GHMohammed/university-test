import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { Plus, Pencil, Trash2, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAcademicTerms,
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
  useSetActiveTerm,
  type AcademicTerm,
  type TermType,
} from '@/hooks/useAcademicTerms';

const TERM_TYPES: TermType[] = ['first', 'second', 'summer', 'custom'];

export default function AdminTerms() {
  const { t } = useI18n();
  const { data: terms = [], isLoading } = useAcademicTerms();
  const createMutation = useCreateTerm();
  const updateMutation = useUpdateTerm();
  const deleteMutation = useDeleteTerm();
  const setActiveMutation = useSetActiveTerm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicTerm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null);
  const [form, setForm] = useState({
    name: '',
    academic_year: '',
    term_type: 'first' as TermType,
    start_date: '',
    end_date: '',
    is_active: false,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      academic_year: '',
      term_type: 'first',
      start_date: '',
      end_date: '',
      is_active: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (term: AcademicTerm) => {
    setEditing(term);
    setForm({
      name: term.name,
      academic_year: term.academic_year,
      term_type: term.term_type as TermType,
      start_date: term.start_date,
      end_date: term.end_date,
      is_active: term.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.academic_year.trim() || !form.start_date || !form.end_date) {
      toast.error(t('term.required_fields'));
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error(t('term.invalid_dates'));
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...form });
        toast.success(t('save'));
      } else {
        await createMutation.mutateAsync(form);
        toast.success(t('add'));
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('delete'));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSetActive = async (term: AcademicTerm) => {
    try {
      await setActiveMutation.mutateAsync(term.id);
      toast.success(t('term.activated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const columns: Column<AcademicTerm>[] = [
    {
      key: 'name',
      header: t('term.name'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.is_active && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Star className="h-3 w-3 me-1" />
              {t('term.active')}
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'academic_year', header: t('term.academic_year'), sortable: true },
    {
      key: 'term_type',
      header: t('term.type'),
      render: (row) => t(`term.type_${row.term_type}` as Parameters<typeof t>[0]),
    },
    { key: 'start_date', header: t('term.start_date'), render: (row) => row.start_date },
    { key: 'end_date', header: t('term.end_date'), render: (row) => row.end_date },
    {
      key: 'actions',
      header: t('actions'),
      render: (row) => (
        <div className="flex gap-1">
          {!row.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetActive(row)}
              title={t('term.set_active')}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={t('admin.terms')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 me-2" />
            {t('term.add')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={terms}
        isLoading={isLoading}
        searchKeys={['name', 'academic_year']}
        emptyTitle={t('term.no_terms')}
      />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('term.edit') : t('term.add')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('term.name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('term.name_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('term.academic_year')}</Label>
              <Input
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                placeholder="2025/2026"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('term.type')}</Label>
              <Select
                value={form.term_type}
                onValueChange={(v) => setForm({ ...form, term_type: v as TermType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERM_TYPES.map((tt) => (
                    <SelectItem key={tt} value={tt}>
                      {t(`term.type_${tt}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('term.start_date')}</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('term.end_date')}</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm">{t('term.set_as_active')}</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit}>{editing ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t('crud.confirm_delete')}
        description={deleteTarget?.name || ''}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
