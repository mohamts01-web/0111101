import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { data, error } = await supabase
    .from('notifications')
    .select('id,notification_type,title,body,data,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: 'تعذر جلب الإشعارات.' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as { id?: string; all?: boolean };
  if (!payload.all && !payload.id) return NextResponse.json({ error: 'معرّف الإشعار مطلوب.' }, { status: 400 });
  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (!payload.all && payload.id) query = query.eq('id', payload.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحديث الإشعار.' }, { status: 500 });
  return NextResponse.json({ updated: true });
}
