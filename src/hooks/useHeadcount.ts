import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeadcountVerification {
  id: string;
  session_id: string;
  expected_count: number;
  detected_count: number;
  mismatch_flag: boolean;
  reviewed_by_instructor: boolean;
  created_at: string;
}

// Configurable mismatch threshold (default: 3 students difference)
const MISMATCH_THRESHOLD = 3;

// ─── useHeadcountVerifications ───────────────────────────────────────────────

export function useHeadcountVerifications(sessionId: string | undefined) {
  return useQuery<HeadcountVerification[]>({
    queryKey: ['headcount-verifications', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('headcount_verifications')
        .select('*')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as HeadcountVerification[];
    },
  });
}

// ─── useCreateHeadcountVerification ──────────────────────────────────────────

export function useCreateHeadcountVerification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      expectedCount,
      detectedCount,
      courseId,
      courseName,
    }: {
      sessionId: string;
      expectedCount: number;
      detectedCount: number;
      courseId: string;
      courseName: string;
    }) => {
      const diff = Math.abs(expectedCount - detectedCount);
      const mismatchFlag = diff >= MISMATCH_THRESHOLD;

      // Insert verification record
      const { data, error } = await supabase
        .from('headcount_verifications')
        .insert({
          session_id: sessionId,
          expected_count: expectedCount,
          detected_count: detectedCount,
          mismatch_flag: mismatchFlag,
          reviewed_by_instructor: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate mismatch alert if threshold exceeded
      if (mismatchFlag && user) {
        await generateMismatchAlert({
          sessionId,
          courseId,
          courseName,
          expectedCount,
          detectedCount,
          diff,
          userId: user.id,
        });
      }

      return { verification: data, mismatchFlag };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['headcount-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });

      if (result.mismatchFlag) {
        toast.warning('Headcount mismatch detected — alert created.');
      } else {
        toast.success('Headcount verification submitted.');
      }
    },
    onError: () => {
      toast.error('Failed to submit headcount verification.');
    },
  });
}

// ─── Mismatch alert generation with deduplication ────────────────────────────

async function generateMismatchAlert({
  sessionId,
  courseId,
  courseName,
  expectedCount,
  detectedCount,
  diff,
  userId,
}: {
  sessionId: string;
  courseId: string;
  courseName: string;
  expectedCount: number;
  detectedCount: number;
  diff: number;
  userId: string;
}) {
  // Dedup marker encodes sessionId to prevent duplicates per session
  const dedupMarker = `[session:${sessionId}]`;

  const title = `⚠️ Headcount Mismatch — ${courseName} ${dedupMarker}`;
  const message = `Physical count (${detectedCount}) differs from recorded attendance (${expectedCount}) by ${diff} students.`;

  // Check for existing unread mismatch alert for this session
  const { data: existing } = await supabase
    .from('alerts')
    .select('id, title, message')
    .eq('type', 'mismatch')
    .eq('read_status', false)
    .like('title', `%${dedupMarker}%`)
    .limit(1);

  const existingAlert = existing?.[0];

  if (existingAlert) {
    // Update if content changed
    if (existingAlert.title !== title || existingAlert.message !== message) {
      await supabase
        .from('alerts')
        .update({ title, message })
        .eq('id', existingAlert.id);
    }
    // Otherwise skip — duplicate
  } else {
    // Create new alert visible to admin + instructor
    await supabase.from('alerts').insert({
      user_id: userId,
      role_target: 'admin' as const,
      type: 'mismatch' as const,
      title,
      message,
    });
  }
}
