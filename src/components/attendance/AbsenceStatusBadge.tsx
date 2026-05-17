import { Badge } from '@/components/ui/badge';
import type { AbsenceStatus } from '@/hooks/useAbsenceRules';
import { useI18n } from '@/lib/i18n';

const statusConfig: Record<AbsenceStatus, { variant: 'default' | 'secondary' | 'destructive'; className: string }> = {
  safe: { variant: 'default', className: 'bg-success text-success-foreground hover:bg-success/90' },
  warning: { variant: 'default', className: 'bg-warning text-warning-foreground hover:bg-warning/90' },
  critical: { variant: 'destructive', className: '' },
};

export function AbsenceStatusBadge({ status }: { status: AbsenceStatus }) {
  const { t } = useI18n();
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {t(`absence.${status}` as any)}
    </Badge>
  );
}
