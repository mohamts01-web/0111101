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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase
    .from('cover_letters')
    .select('id,resume_id,title,language,job_description,content,updated_at')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: 'لم يتم العثور على الخطاب.' }, { status: 404 });
  return NextResponse.json({ coverLetter: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { title?: string; content?: string };
  if (!body.content?.trim()) return NextResponse.json({ error: 'محتوى الخطاب فارغ.' }, { status: 400 });
  const { data, error } = await supabase
    .from('cover_letters')
    .update({
      title: body.title?.trim() || 'خطاب تغطية',
      content: body.content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id,title,updated_at')
    .single();
  if (error) return NextResponse.json({ error: 'تعذر تحديث الخطاب.' }, { status: 500 });
  return NextResponse.json({ coverLetter: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from('cover_letters').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'تعذر حذف الخطاب.' }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
