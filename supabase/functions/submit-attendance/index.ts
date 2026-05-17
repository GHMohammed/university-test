import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceRequest {
  qr_token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') ?? null;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = token
      ? await supabaseClient.auth.getUser(token)
      : await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError?.message || 'User not found'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a student
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Only students can submit attendance' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { qr_token }: AttendanceRequest = await req.json();
    const normalizedToken = qr_token?.trim();

    if (!normalizedToken) {
      return new Response(
        JSON.stringify({ error: 'QR token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find session by QR token
    const { data: session, error: sessionError } = await supabaseClient
      .from('lecture_sessions')
      .select('id, status, qr_expires_at, course_id, courses(id, name), classrooms(id, name)')
      .eq('qr_token', normalizedToken)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid QR code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Session is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.qr_expires_at) {
      const expiryDate = new Date(session.qr_expires_at);
      if (new Date() > expiryDate) {
        return new Response(
          JSON.stringify({ error: 'QR code has expired. Ask your instructor to refresh it and try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await supabaseClient
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', session.course_id)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'You are not enrolled in this course' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Duplicate check
    const { data: existingAttendance } = await supabaseClient
      .from('attendance_records')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existingAttendance) {
      return new Response(
        JSON.stringify({ error: 'You have already recorded attendance for this session' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: attendance, error: insertError } = await supabaseClient
      .from('attendance_records')
      .insert({
        session_id: session.id,
        student_id: user.id,
        attendance_status: 'present',
        attendance_source: 'qr',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        attendance,
        session: {
          course_name: session.courses?.name,
          classroom_name: session.classrooms?.name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
