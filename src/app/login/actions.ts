'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

interface FormData {
  email: string;
  password: string;
  next?: string;
}
export async function login(data: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });

  if (error) {
    return { error: true };
  }

  revalidatePath('/', 'layout');
  const next = data.next?.startsWith('/') && !data.next.startsWith('//') ? data.next : '/dashboard';
  redirect(next);
}

export async function signInWithGithub() {
  const supabase = await createClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `https://paddle-billing.vercel.app/auth/callback`,
    },
  });
  if (data.url) {
    redirect(data.url);
  }
}

export async function loginAnonymously() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { error: true };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
