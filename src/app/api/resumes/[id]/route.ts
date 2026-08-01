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
  const { id } = await params;
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const { data, error } = await supabase
    .from('resumes')
    .select('id,title,language,template,page_mode,content,settings,updated_at')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: 'لم يتم العثور على السيرة.' }, { status: 404 });
  return NextResponse.json({ resume: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const { error } = await supabase.from('resumes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'تعذر حذف السيرة.' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
