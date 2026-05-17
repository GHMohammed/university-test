import { Badge } from '@/components/ui/badge';
import type { AttendanceStatus } from '@/types';
import { useI18n } from '@/lib/i18n';

const statusConfig: Record<AttendanceStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  present: { variant: 'default', className: 'bg-success text-success-foreground hover:bg-success/90' },
  absent: { variant: 'destructive', className: '' },
  late: { variant: 'default', className: 'bg-warning text-warning-foreground hover:bg-warning/90' },
  rejected: { variant: 'secondary', className: 'bg-muted text-muted-foreground' },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const { t } = useI18n();
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {t(`attendance.${status}` as any)}
    </Badge>
  );
}
