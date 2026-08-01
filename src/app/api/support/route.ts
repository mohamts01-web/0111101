import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { recordActivity } from '@/lib/activity';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id,category,subject,status,created_at,updated_at,support_messages(id,author_type,body,created_at)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر جلب رسائل الدعم.' }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as { category?: string; subject?: string; body?: string };
  const category = payload.category?.trim();
  const subject = payload.subject?.trim() ?? '';
  const body = payload.body?.trim() ?? '';
  if (!category || !['complaint', 'suggestion', 'support'].includes(category))
    return NextResponse.json({ error: 'اختر نوع الرسالة.' }, { status: 400 });
  if (subject.length < 3 || subject.length > 160 || !body || body.length > 5000)
    return NextResponse.json({ error: 'تحقق من عنوان الرسالة وتفاصيلها.' }, { status: 400 });

  const internal = await createInternalClient();
  const { data: ticket, error: ticketError } = await internal
    .from('support_tickets')
    .insert({ user_id: user.id, contact_email: user.email, category, subject })
    .select('id')
    .single();
  if (ticketError || !ticket) return NextResponse.json({ error: 'تعذر إنشاء التذكرة.' }, { status: 500 });
  const { error: messageError } = await internal
    .from('support_messages')
    .insert({ ticket_id: ticket.id, author_user_id: user.id, author_type: 'user', body });
  if (messageError) return NextResponse.json({ error: 'تم إنشاء التذكرة وتعذر إرفاق الرسالة.' }, { status: 500 });
  void recordActivity({
    userId: user.id,
    eventType: 'support.ticket_created',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { category },
  });
  return NextResponse.json({ created: true, ticketId: ticket.id }, { status: 201 });
}
