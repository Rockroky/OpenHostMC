/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.151', 'localhost', '127.0.0.1'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const orchestratorUrl = (process.env.ORCHESTRATOR_INTERNAL_URL || process.env.API_URL || 'http://localhost:3002').replace(/\/$/, '');
    return [
      {
        source: '/api/orchestrator/:path*',
        destination: `${orchestratorUrl}/orchestrator/:path*`,
      },
      {
        source: '/api/servers/:path*',
        destination: 'http://localhost:3003/servers/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

