import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ar', '/en', '/resume/new'],
        disallow: ['/admin/', '/dashboard/', '/api/', '/checkout/', '/welcome'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
