import { HomeRoute } from '@/components/home/home-route';
import { getRequestLocale } from '@/lib/server-locale';

export default async function Home() {
  const locale = await getRequestLocale();
  return <HomeRoute locale={locale} />;
}
