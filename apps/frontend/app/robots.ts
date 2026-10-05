import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/console/', '/server-management/'],
    },
    sitemap: 'https://openhostmc.com/sitemap.xml',
  };
}
