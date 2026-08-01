import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { recordActivity } from '@/lib/activity';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const body = (await request.json()) as { fullName?: string; phone?: string; email?: string };
  const fullName = body.fullName?.trim() ?? '';
  const phone = body.phone?.trim() ?? '';
  const email = body.email?.trim().toLowerCase();
  if (fullName.length > 100 || phone.length > 30 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: 'تحقق من الاسم ورقم الهاتف والبريد.' }, { status: 400 });
  }

  const internal = await createInternalClient();
  const { error: profileError } = await internal.from('profiles').upsert({
    user_id: user.id,
    full_name: fullName,
    phone: phone || null,
    updated_at: new Date().toISOString(),
  });
  if (profileError) return NextResponse.json({ error: 'تعذر حفظ بيانات الحساب.' }, { status: 500 });

  const authUpdates: { email?: string; data: Record<string, string> } = { data: { full_name: fullName, phone } };
  if (email && email !== user.email) authUpdates.email = email;
  const { error: authError } = await supabase.auth.updateUser(authUpdates);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  void recordActivity({
    userId: user.id,
    eventType: 'account.profile_updated',
    entityType: 'profile',
    entityId: user.id,
    metadata: { emailChangeRequested: Boolean(authUpdates.email) },
  });
  return NextResponse.json({ saved: true, emailConfirmationRequired: Boolean(authUpdates.email) });
}
