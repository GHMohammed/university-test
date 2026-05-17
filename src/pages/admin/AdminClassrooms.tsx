import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { useClassrooms, useCreateClassroom, useUpdateClassroom, useDeleteClassroom } from '@/hooks/useClassrooms';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Classroom = { id: string; name: string; building: string; capacity: number; latitude: number; longitude: number; allowed_radius_meters: number };

export default function AdminClassrooms() {
  const { t } = useI18n();
  const { data = [], isLoading } = useClassrooms();
  const createMutation = useCreateClassroom();
  const updateMutation = useUpdateClassroom();
  const deleteMutation = useDeleteClassroom();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [mapTarget, setMapTarget] = useState<Classroom | null>(null);

  const [form, setForm] = useState({ name: '', building: '', capacity: 30, latitude: 0, longitude: 0, allowed_radius_meters: 100 });

  const openCreate = () => { setEditing(null); setForm({ name: '', building: '', capacity: 30, latitude: 0, longitude: 0, allowed_radius_meters: 100 }); setDialogOpen(true); };
  const openEdit = (c: Classroom) => { setEditing(c); setForm({ name: c.name, building: c.building, capacity: c.capacity, latitude: c.latitude, longitude: c.longitude, allowed_radius_meters: c.allowed_radius_meters }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...form });
        toast.success(t('save'));
      } else {
        await createMutation.mutateAsync(form);
        toast.success(t('add'));
      }
      setDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('delete'));
      setDeleteTarget(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const columns: Column<Classroom>[] = [
    { key: 'name', header: t('crud.name'), sortable: true },
    { key: 'building', header: t('crud.building'), sortable: true },
    { key: 'capacity', header: t('crud.capacity'), sortable: true },
    { key: 'latitude', header: t('crud.latitude') },
    { key: 'longitude', header: t('crud.longitude') },
    { key: 'allowed_radius_meters', header: t('crud.radius') },
    {
      key: 'actions', header: t('actions'),
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">···</Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4 me-2" />{t('edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMapTarget(row)}><MapPin className="h-4 w-4 me-2" />{t('crud.view_map')}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4 me-2" />{t('delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader title={t('admin.classrooms')} actions={<Button onClick={openCreate}><Plus className="h-4 w-4 me-2" />{t('crud.add_classroom')}</Button>} />
      <DataTable columns={columns} data={data as Classroom[]} isLoading={isLoading} searchKeys={['name', 'building']} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('crud.edit_classroom') : t('crud.add_classroom')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('crud.name')}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('crud.building')}</Label><Input value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('crud.capacity')}</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('crud.radius')}</Label><Input type="number" value={form.allowed_radius_meters} onChange={e => setForm({ ...form, allowed_radius_meters: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('crud.latitude')}</Label><Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: +e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('crud.longitude')}</Label><Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: +e.target.value })} /></div>
            </div>
            {(form.latitude !== 0 || form.longitude !== 0) && (
              <div className="rounded-md overflow-hidden border h-48">
                <iframe
                  title="map"
                  width="100%" height="100%" style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.longitude - 0.005},${form.latitude - 0.003},${form.longitude + 0.005},${form.latitude + 0.003}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.building}>{editing ? t('save') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map preview dialog */}
      <Dialog open={!!mapTarget} onOpenChange={() => setMapTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{mapTarget?.name} - {mapTarget?.building}</DialogTitle></DialogHeader>
          {mapTarget && (
            <div className="rounded-md overflow-hidden border h-80">
              <iframe
                title="map"
                width="100%" height="100%" style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapTarget.longitude - 0.005},${mapTarget.latitude - 0.003},${mapTarget.longitude + 0.005},${mapTarget.latitude + 0.003}&layer=mapnik&marker=${mapTarget.latitude},${mapTarget.longitude}`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title={t('crud.confirm_delete')} description={t('crud.confirm_delete_desc')} onConfirm={handleDelete} />
    </DashboardLayout>
  );
}
