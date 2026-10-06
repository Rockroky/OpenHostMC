import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/console/', '/server-management/', '/dashboard/', '/server/new/'],
    },
    sitemap: 'https://openhostmc.com/sitemap.xml',
  };
}
