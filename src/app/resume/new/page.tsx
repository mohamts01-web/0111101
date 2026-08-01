import { ResumeBuilder } from '@/components/resume-builder/resume-builder';
import { CV_PRODUCT_NAME } from '@/lib/brand';

export const metadata = {
  title: `إنشاء سيرة ذاتية | ${CV_PRODUCT_NAME}`,
  description: 'أنشئ سيرتك الذاتية مباشرة دون تسجيل.',
};

export default function GuestResumePage() {
  return <ResumeBuilder isGuest />;
}
