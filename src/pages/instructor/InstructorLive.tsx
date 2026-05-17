import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useI18n } from '@/lib/i18n';

export default function InstructorLive() {
  const { t } = useI18n();
  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.live')} />
      <EmptyState title={t('no_data')} />
    </DashboardLayout>
  );
}
