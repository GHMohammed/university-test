import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { AlertFilters, AlertType } from '@/hooks/useAlerts';

interface AlertFilterProps {
  filters: AlertFilters;
  onChange: (filters: AlertFilters) => void;
}

export function AlertFilter({ filters, onChange }: AlertFilterProps) {
  const { t } = useI18n();

  const types: { value: AlertType | 'all'; label: string }[] = [
    { value: 'all', label: t('alerts.all_types') },
    { value: 'mismatch', label: t('alerts.type_mismatch') },
    { value: 'absence_warning', label: t('alerts.type_absence_warning') },
    { value: 'suspicious', label: t('alerts.type_suspicious') },
    { value: 'system', label: t('alerts.type_system') },
  ];

  const statuses: { value: 'all' | 'read' | 'unread'; label: string }[] = [
    { value: 'all', label: t('alerts.all_statuses') },
    { value: 'unread', label: t('alerts.unread') },
    { value: 'read', label: t('alerts.read') },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.type || 'all'}
        onValueChange={(val) => onChange({ ...filters, type: val as AlertType | 'all' })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('alerts.filter_type')} />
        </SelectTrigger>
        <SelectContent>
          {types.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.readStatus || 'all'}
        onValueChange={(val) => onChange({ ...filters, readStatus: val as 'all' | 'read' | 'unread' })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('alerts.filter_status')} />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
