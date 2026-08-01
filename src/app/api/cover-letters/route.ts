import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

async function clientForRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  return authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : createClient();
}

export async function GET(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { data, error } = await supabase
    .from('cover_letters')
    .select('id,resume_id,title,language,content,updated_at')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل خطابات التغطية.' }, { status: 500 });
  return NextResponse.json({ coverLetters: data });
}

export async function POST(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const body = (await request.json()) as {
    resumeId?: string;
    title?: string;
    language?: 'ar' | 'en';
    jobDescription?: string;
    content?: string;
  };
  if (!body.content?.trim() || !body.language)
    return NextResponse.json({ error: 'محتوى الخطاب غير مكتمل.' }, { status: 400 });
  const { data, error } = await supabase
    .from('cover_letters')
    .insert({
      user_id: user.id,
      resume_id: body.resumeId || null,
      title: body.title || (body.language === 'ar' ? 'خطاب تغطية' : 'Cover Letter'),
      language: body.language,
      job_description: body.jobDescription || null,
      content: body.content,
    })
    .select('id,title,updated_at')
    .single();
  if (error) return NextResponse.json({ error: 'تعذر حفظ خطاب التغطية.' }, { status: 500 });
  return NextResponse.json({ coverLetter: data });
}
