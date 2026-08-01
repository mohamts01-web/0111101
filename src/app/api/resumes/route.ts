import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { resolveEffectiveEntitlement } from '@/lib/effective-entitlement';
import { savedResumeLimit } from '@/lib/resume-limits';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { recordActivity } from '@/lib/activity';

type ResumePayload = {
  id: string;
  title: string;
  language: 'ar' | 'en';
  template: 'compact' | 'centered' | 'minimal' | 'executive';
  pageMode: 'one' | 'two';
  content: Record<string, string>;
  settings: Record<string, unknown>;
};

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
    .from('resumes')
    .select('id,title,language,template,page_mode,content,settings,updated_at')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل السير الذاتية.' }, { status: 500 });
  return NextResponse.json({ resumes: data });
}

export async function POST(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  const body = (await request.json()) as ResumePayload;
  if (!body.id || !body.content || !['ar', 'en'].includes(body.language)) {
    return NextResponse.json({ error: 'بيانات السيرة غير مكتملة.' }, { status: 400 });
  }

  const internal = await createInternalClient();
  const { data: existing, error: existingError } = await internal
    .from('resumes')
    .select('id')
    .eq('id', body.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: 'تعذر التحقق من حد السير الذاتية.' }, { status: 500 });

  if (!existing) {
    try {
      const entitlement = await resolveEffectiveEntitlement(internal, user.id);
      const limit = savedResumeLimit(entitlement.plan);
      if (limit !== null) {
        const { count, error: countError } = await internal
          .from('resumes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (countError) return NextResponse.json({ error: 'تعذر التحقق من حد السير الذاتية.' }, { status: 500 });
        if ((count ?? 0) >= limit) {
          return NextResponse.json(
            { error: `بلغت الحد الأقصى لحفظ ${limit} سيرة ذاتية في باقتك.`, code: 'RESUME_LIMIT_REACHED' },
            { status: 403 },
          );
        }
      }
    } catch (error) {
      console.error('Resume limit check failed', error);
      return NextResponse.json({ error: 'تعذر التحقق من استحقاق حفظ السيرة.' }, { status: 503 });
    }
  }

  const record = {
    id: body.id,
    user_id: user.id,
    title: body.title || 'سيرة ذاتية بدون عنوان',
    language: body.language,
    template: body.template,
    page_mode: body.pageMode,
    content: body.content,
    settings: body.settings,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await internal
    .from('resumes')
    .upsert(record, { onConflict: 'id' })
    .select('id,updated_at')
    .single();
  if (error) return NextResponse.json({ error: 'تعذر حفظ السيرة.' }, { status: 500 });
  void recordActivity({
    userId: user.id,
    eventType: 'resume.saved',
    entityType: 'resume',
    entityId: body.id,
    metadata: { language: body.language, template: body.template, pageMode: body.pageMode },
  });
  return NextResponse.json({ resume: data });
}
