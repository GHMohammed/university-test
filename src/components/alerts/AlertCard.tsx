import { format } from 'date-fns';
import { AlertTriangle, Bell, Users, Shield, Check, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Alert, AlertType } from '@/hooks/useAlerts';

interface AlertCardProps {
  alert: Alert;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  isMarkingRead?: boolean;
}

const typeConfig: Record<AlertType, { icon: typeof AlertTriangle; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  mismatch: { icon: Users, variant: 'destructive', color: 'text-destructive' },
  suspicious: { icon: Shield, variant: 'destructive', color: 'text-destructive' },
  absence_warning: { icon: AlertTriangle, variant: 'secondary', color: 'text-warning' },
  system: { icon: Bell, variant: 'outline', color: 'text-primary' },
};

export function AlertCard({ alert, onMarkRead, onDelete, showDelete, isMarkingRead }: AlertCardProps) {
  const { t, dir } = useI18n();
  const config = typeConfig[alert.type] || typeConfig.system;
  const Icon = config.icon;

  const typeLabel = {
    mismatch: t('alerts.type_mismatch'),
    absence_warning: t('alerts.type_absence_warning'),
    suspicious: t('alerts.type_suspicious'),
    system: t('alerts.type_system'),
  }[alert.type];

  return (
    <Card className={`shadow-card transition-all ${!alert.read_status ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.color} bg-current/10`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={config.variant} className="text-xs">
                {typeLabel}
              </Badge>
              {!alert.read_status && (
                <Badge variant="default" className="text-xs">
                  {t('alerts.unread')}
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-card-foreground mb-1">{alert.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(alert.created_at), 'PPp')}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!alert.read_status && onMarkRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkRead(alert.id)}
                disabled={isMarkingRead}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">{t('alerts.mark_read')}</span>
              </Button>
            )}
            {showDelete && onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(alert.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
