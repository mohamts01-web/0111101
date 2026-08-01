import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { sendTransactionalEmail } from '@/lib/resend';
import { BRAND_NAME } from '@/lib/brand';

export async function notifyUser({
  userId,
  type,
  title,
  body,
  data = {},
  email,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  email?: string | null;
}) {
  const internal = await createInternalClient();
  const { error } = await internal.from('notifications').insert({
    user_id: userId,
    notification_type: type,
    title,
    body,
    data,
  });
  if (error) throw error;

  let recipient = email;
  if (!recipient) {
    const { data: authUser } = await internal.auth.admin.getUserById(userId);
    recipient = authUser.user?.email;
  }
  if (recipient) {
    await sendTransactionalEmail({
      to: recipient,
      subject: `${BRAND_NAME} | ${title}`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif"><p dir="ltr" style="font-family:Arial,sans-serif;font-weight:800">${BRAND_NAME}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></div>`,
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;',
    };
    return entities[character];
  });
}
