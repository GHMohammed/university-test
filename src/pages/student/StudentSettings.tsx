import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { useI18n } from '@/lib/i18n';

export default function StudentSettings() {
  const { t } = useI18n();
  return (
    <DashboardLayout>
      <PageHeader title={t('settings')} />
      <SettingsForm />
    </DashboardLayout>
  );
}
