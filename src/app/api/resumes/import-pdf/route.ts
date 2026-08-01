import { NextResponse } from 'next/server';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

async function clientForRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  return authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : createClient();
}

export async function POST(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول لاستيراد السيرة.' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'لم يتم إرفاق ملف PDF.' }, { status: 400 });
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'يسمح بملفات PDF فقط.' }, { status: 415 });
  }
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'حجم الملف يتجاوز 10MB.' }, { status: 413 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdf(buffer);
    const text = parsed.text.replace(/\u0000/g, '').trim();
    if (!text)
      return NextResponse.json(
        { error: 'لم يتم العثور على نص قابل للاستخراج. ارفع PDF نصيًا وليس صورة ممسوحة.' },
        { status: 422 },
      );
    return NextResponse.json({ text: text.slice(0, 60_000), pages: parsed.numpages });
  } catch (error) {
    console.error('PDF resume extraction failed', error);
    return NextResponse.json({ error: 'تعذر قراءة ملف PDF.' }, { status: 422 });
  }
}
