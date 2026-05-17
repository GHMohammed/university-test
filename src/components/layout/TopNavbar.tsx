import { Bell, Globe, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { TermSwitcher } from '@/components/layout/TermSwitcher';

export function TopNavbar() {
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="shrink-0" />
        <h1 className="text-sm font-semibold text-foreground hidden sm:block">
          {t('app.title')}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <TermSwitcher />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          title={lang === 'ar' ? 'English' : 'العربية'}
        >
          <Globe className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{profile?.full_name}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
