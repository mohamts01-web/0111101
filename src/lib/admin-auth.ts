import { createClient } from '@/utils/supabase/server';

export function isConfiguredAdmin(email?: string | null) {
  if (!email) return false;
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase());
}

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isConfiguredAdmin(user.email)) return null;
  return user;
}
