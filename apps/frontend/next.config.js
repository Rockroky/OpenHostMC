/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.151', 'localhost', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/api/orchestrator/:path*',
        destination: 'http://localhost:3002/orchestrator/:path*',
      },
      {
        source: '/api/servers/:path*',
        destination: 'http://localhost:3003/servers/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
