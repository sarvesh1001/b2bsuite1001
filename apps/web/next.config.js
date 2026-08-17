/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.101.10', '192.168.31.103'], // add your development IPs
  transpilePackages: ['@b2b/shared-types'],
  redirects: async () => [
    {
      source: '/',
      destination: '/dashboard',
      permanent: true,
    },
  ],
};

module.exports = nextConfig;