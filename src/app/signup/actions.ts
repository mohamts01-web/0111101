'use server';

import { createClient } from '@/utils/supabase/server';

interface FormData {
  email: string;
  password: string;
}

export async function signup(data: FormData) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder') ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('PASTE_')
  ) {
    return { error: true, message: 'إعدادات Supabase غير مكتملة. أضف مفاتيح المشروع في ملف .env.local.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: true, message: error.message };
  }

  return { success: true };
}
