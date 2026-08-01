import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';
  const languages = { 'ar-SA': `${baseUrl}/ar`, en: `${baseUrl}/en`, 'x-default': baseUrl };
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: `${baseUrl}/ar`, changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: `${baseUrl}/en`, changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: `${baseUrl}/resume/new`, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
