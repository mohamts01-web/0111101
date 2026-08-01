import 'server-only';

import { cookies } from 'next/headers';
import type { AppLocale } from '@/components/localization/locale-provider';

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return cookieStore.get('cv-locale')?.value === 'en' ? 'en' : 'ar';
}
