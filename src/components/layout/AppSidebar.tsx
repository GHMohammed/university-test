import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Building2, Calendar,
  UserPlus, BarChart3, AlertTriangle, Settings, QrCode, Radio,
  Camera, FileText, ScanLine, History, Bell, ClipboardList, CalendarRange
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const adminItems = [
  { key: 'admin.dashboard', url: '/admin', icon: LayoutDashboard },
  { key: 'admin.students', url: '/admin/students', icon: GraduationCap },
  { key: 'admin.instructors', url: '/admin/instructors', icon: Users },
  { key: 'admin.courses', url: '/admin/courses', icon: BookOpen },
  { key: 'admin.classrooms', url: '/admin/classrooms', icon: Building2 },
  { key: 'admin.terms', url: '/admin/terms', icon: CalendarRange },
  { key: 'admin.schedules', url: '/admin/schedules', icon: Calendar },
  { key: 'admin.enrollments', url: '/admin/enrollments', icon: UserPlus },
  { key: 'admin.reports', url: '/admin/reports', icon: BarChart3 },
  { key: 'admin.alerts', url: '/admin/alerts', icon: AlertTriangle },
  { key: 'settings', url: '/admin/settings', icon: Settings },
] as const;

const instructorItems = [
  { key: 'instructor.dashboard', url: '/instructor', icon: LayoutDashboard },
  { key: 'instructor.courses', url: '/instructor/courses', icon: BookOpen },
  { key: 'instructor.sessions', url: '/instructor/sessions', icon: Calendar },
  { key: 'instructor.headcount', url: '/instructor/headcount', icon: Camera },
  { key: 'instructor.reports', url: '/instructor/reports', icon: FileText },
  { key: 'instructor.alerts', url: '/instructor/alerts', icon: AlertTriangle },
  { key: 'settings', url: '/instructor/settings', icon: Settings },
] as const;

const studentItems = [
  { key: 'student.dashboard', url: '/student', icon: LayoutDashboard },
  { key: 'student.courses', url: '/student/courses', icon: BookOpen },
  { key: 'student.schedule', url: '/student/schedule', icon: Calendar },
  { key: 'student.scan', url: '/student/scan', icon: ScanLine },
  { key: 'student.history', url: '/student/history', icon: History },
  { key: 'student.warnings', url: '/student/warnings', icon: Bell },
  { key: 'settings', url: '/student/settings', icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, dir } = useI18n();
  const { role, profile } = useAuth();

  const items = role === 'admin' ? adminItems : role === 'instructor' ? instructorItems : studentItems;
  const roleLabel = role ? t(`role.${role}` as any) : '';

  return (
    <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'} className="gradient-sidebar border-e-0">
      <SidebarContent>
        {/* Logo area */}
        {!collapsed && (
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-sidebar-foreground">{t('app.title')}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
            {!collapsed && (roleLabel)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin' || item.url === '/instructor' || item.url === '/student'}
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.key as any)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
