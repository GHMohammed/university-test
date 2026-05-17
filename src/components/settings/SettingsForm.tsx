import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import type { Language } from '@/types';

export function SettingsForm() {
  const { profile, role } = useAuth();
  const { t, lang, setLang } = useI18n();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const roleLabel = role ? t(`role.${role}` as any) : '';

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ id: profile.id, full_name: fullName, phone: phone || null });
      toast({ title: t('settings.profile_updated') });
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: t('settings.password_min'), variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('settings.password_mismatch'), variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t('settings.password_updated') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLang(value as Language);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('crud.full_name')}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input value={profile?.email ?? ''} disabled className="opacity-70" />
          </div>
          <div className="space-y-2">
            <Label>{t('crud.phone')}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.role')}</Label>
            <Input value={roleLabel} disabled className="opacity-70" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? t('loading') : t('settings.save_profile')}
          </Button>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={lang} onValueChange={handleLanguageChange} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="ar" id="lang-ar" />
              <Label htmlFor="lang-ar">{t('settings.arabic')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en">{t('settings.english')}</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.change_password')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.new_password')}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.confirm_password')}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline">
            {changingPassword ? t('loading') : t('settings.update_password')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
