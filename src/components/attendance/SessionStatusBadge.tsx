import { Badge } from '@/components/ui/badge';
import type { SessionStatus } from '@/types';
import { useI18n } from '@/lib/i18n';

const statusConfig: Record<SessionStatus, { className: string }> = {
  scheduled: { className: 'bg-info/10 text-info border-info/20' },
  active: { className: 'bg-success/10 text-success border-success/20 animate-pulse' },
  closed: { className: 'bg-muted text-muted-foreground' },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const { t } = useI18n();
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={config.className}>
      {t(`session.${status}` as any)}
    </Badge>
  );
}
