import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('guided_resume_used_at, guided_resume_claimed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Unable to load guided resume status.' }, { status: 500 });

  return NextResponse.json({
    trialAvailable: !data?.guided_resume_used_at && !data?.guided_resume_claimed_at,
    cost: 10,
  });
}
