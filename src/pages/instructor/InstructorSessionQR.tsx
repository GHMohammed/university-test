import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useSession, useRegenerateQR } from '@/hooks/useSessions';
import { useSessionAttendance } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

export default function InstructorSessionQR() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<string>('');

  const { data: session, isLoading } = useSession(id);
  const { data: attendance } = useSessionAttendance(id);
  const regenerateQR = useRegenerateQR();

  const isExpired = session?.qr_expires_at ? new Date(session.qr_expires_at) < new Date() : false;

  useEffect(() => {
    if (!session?.qr_expires_at) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(session.qr_expires_at!);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.qr_expires_at]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">{t('loading')}</div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">{t('no_data')}</div>
      </DashboardLayout>
    );
  }

  if (session.status !== 'active') {
    return (
      <DashboardLayout>
        <PageHeader 
          title={t('session.qr_title')}
          actions={
            <Button variant="outline" onClick={() => navigate(`/instructor/sessions/${id}`)}>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('cancel')}
            </Button>
          }
        />
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">{t('scan.error_inactive')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title={t('session.qr_title')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => regenerateQR.mutate(id!)}
              disabled={regenerateQR.isPending}
            >
              <RefreshCw className="h-4 w-4 me-2" />
              {t('session.qr_refresh')}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/instructor/sessions/${id}`)}>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('cancel')}
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1">
            {session.courses?.code} - {session.courses?.name}
          </h2>
          <p className="text-muted-foreground">
            {session.classrooms?.name} • {format(new Date(session.start_time), 'HH:mm')} - {format(new Date(session.end_time), 'HH:mm')}
          </p>
        </div>

        <Card className="border-2">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-6">
              <div className="p-8 bg-background rounded-lg border-4 border-primary">
                <QRCodeSVG
                  value={session.qr_token}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t('session.qr_expires')}: {timeLeft}
                  </span>
                </div>
                {isExpired ? (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 me-1" />
                    {t('session.qr_expired')}
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {t('session.qr_valid')}
                  </Badge>
                )}
              </div>

              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">{t('session.attended')}</div>
                <div className="text-3xl font-bold">{attendance?.length || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono break-all">{session.qr_token}</CardTitle>
            <CardDescription>
              {t('scan.manual_token')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
