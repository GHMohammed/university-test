import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users } from 'lucide-react';

export default function InstructorCourses() {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user!.id)
        .order('code');
      if (error) throw error;

      // Get enrollment counts
      const courseIds = data.map(c => c.id);
      if (courseIds.length === 0) return [];
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .in('course_id', courseIds);
      const countMap: Record<string, number> = {};
      (enrollments || []).forEach(e => {
        countMap[e.course_id] = (countMap[e.course_id] || 0) + 1;
      });
      return data.map(c => ({ ...c, enrolled_count: countMap[c.id] || 0 }));
    },
  });

  return (
    <DashboardLayout>
      <PageHeader title={t('instructor.courses')} />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title={t('no_data')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{course.code}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {course.enrolled_count}
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{course.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {course.department && (
                  <p className="text-sm text-muted-foreground mb-1">{course.department}</p>
                )}
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
