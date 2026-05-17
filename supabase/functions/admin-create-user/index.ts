import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Verify caller is admin
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const callerUserId = claimsData.claims.sub
    
    // Check admin role
    const { data: roleCheck } = await anonClient.rpc('has_role', { _user_id: callerUserId, _role: 'admin' })
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { email, password, full_name, phone, department, role, student_code, instructor_code } = body

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }), { status: 400, headers: corsHeaders })
    }

    if (!['student', 'instructor'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Role must be student or instructor' }), { status: 400, headers: corsHeaders })
    }

    // Use service role to create auth user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone, department, student_code, instructor_code },
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders })
    }

    const userId = authData.user.id

    // Update profile with extra fields (trigger already created basic profile)
    await adminClient.from('profiles').update({
      full_name,
      phone: phone || null,
      department: department || null,
      student_code: student_code || null,
      instructor_code: instructor_code || null,
    }).eq('id', userId)

    // Insert role
    await adminClient.from('user_roles').insert({ user_id: userId, role })

    // Fetch and return the profile
    const { data: profile } = await adminClient.from('profiles').select('*').eq('id', userId).single()

    return new Response(JSON.stringify({ profile, role }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
