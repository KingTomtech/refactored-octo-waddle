/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'app-oss.byte-app.com' },
      { protocol: 'https', hostname: '*.byte-app.com' },
      { protocol: 'https', hostname: 'pbcdn.aoneroom.com', pathname: '/image/**' },
      { protocol: 'https', hostname: 'macdn.aoneroom.com', pathname: '/media/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
