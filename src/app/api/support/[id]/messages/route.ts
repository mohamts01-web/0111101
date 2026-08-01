import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as { body?: string };
  const body = payload.body?.trim() ?? '';
  if (!body || body.length > 5000)
    return NextResponse.json({ error: 'اكتب ردًا لا يتجاوز 5000 حرف.' }, { status: 400 });
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: 'التذكرة غير موجودة.' }, { status: 404 });
  const internal = await createInternalClient();
  const { error } = await internal
    .from('support_messages')
    .insert({ ticket_id: id, author_user_id: user.id, author_type: 'user', body });
  if (error) return NextResponse.json({ error: 'تعذر إرسال الرد.' }, { status: 500 });
  await internal.from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ created: true });
}
