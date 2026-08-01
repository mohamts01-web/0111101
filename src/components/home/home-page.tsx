'use client';

import { createClient } from '@/utils/supabase/client';
import { useUserInfo } from '@/hooks/useUserInfo';
import '../../styles/home-page.css';
import Header from '@/components/home/header/header';
import { HeroSection } from '@/components/home/hero-section/hero-section';
import { Pricing } from '@/components/home/pricing/pricing';
import { Footer } from '@/components/home/footer/footer';

interface Props {
  country?: string;
}

export function HomePage({ country }: Props) {
  const supabase = createClient();
  const { user } = useUserInfo(supabase);

  return (
    <>
      <div className="load-home">
        <Header user={user} />
        <HeroSection />
        <Pricing country={country} userEmail={user?.email} />
        <Footer />
      </div>
    </>
  );
}
