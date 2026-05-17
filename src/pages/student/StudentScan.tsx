import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useSubmitAttendance } from '@/hooks/useAttendance';

export default function StudentScan() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scannedResult, setScannedResult] = useState<{ success: boolean; message: string } | null>(null);

  const submitMutation = useSubmitAttendance();

  const handleScan = (text: string) => {
    const token = text.trim();

    if (!token) {
      setScannedResult({
        success: false,
        message: t('scan.error_invalid'),
      });
      return;
    }

    setCameraActive(false);

    submitMutation.mutate(
      { qr_token: token },
      {
        onSuccess: (data) => {
          setScannedResult({
            success: true,
            message: `${t('scan.success')} - ${data.session.course_name}`,
          });
          setManualToken('');
        },
        onError: (error) => {
          setScannedResult({
            success: false,
            message: error.message || t('scan.error_invalid'),
          });
        },
      }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScan(manualToken.trim());
  };

  return (
    <DashboardLayout>
      <PageHeader title={t('scan.title')} description={t('scan.subtitle')} />

      <div className="max-w-2xl mx-auto space-y-6">
        {scannedResult && (
          <Card className={`border-2 ${scannedResult.success ? 'border-green-600' : 'border-destructive'}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {scannedResult.success ? (
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-destructive" />
                )}
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {scannedResult.success ? t('scan.success') : 'Error'}
                  </h3>
                  <p className="text-muted-foreground">{scannedResult.message}</p>
                </div>
                <Button variant="outline" onClick={() => setScannedResult(null)}>
                  Scan Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!scannedResult && (
          <>
            <Card>
              <CardContent className="pt-6">
                {cameraActive ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-w-sm mx-auto">
                      <Scanner
                        onResult={(text) => handleScan(text)}
                        onError={(error) => console.error(error)}
                        options={{ delayBetweenScanAttempts: 1000 }}
                      />
                    </div>
                    <div className="text-center">
                      <Button variant="outline" onClick={() => setCameraActive(false)}>
                        <X className="h-4 w-4 me-2" />
                        {t('scan.stop_camera')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Camera className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">{t('scan.camera_hint')}</h3>
                    <Button size="lg" onClick={() => setCameraActive(true)}>
                      <Camera className="h-5 w-5 me-2" />
                      {t('scan.start_camera')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {!cameraActive && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('scan.or')}
                  </span>
                </div>
              </div>
            )}

            {!cameraActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('scan.manual_token')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <Input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder={t('scan.manual_placeholder')}
                      className="font-mono"
                    />
                    <Button type="submit" disabled={!manualToken.trim() || submitMutation.isPending}>
                      {submitMutation.isPending ? t('loading') : t('scan.submit')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
