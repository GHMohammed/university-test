import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useI18n } from '@/lib/i18n';

export default function InstructorQR() {
  const { t } = useI18n();
  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.qr')} />
      <EmptyState title={t('no_data')} />
    </DashboardLayout>
  );
}
