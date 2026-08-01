/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.simpleicons.org' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'paddle-billing.vercel.app' },
    ],
  },
};

export default nextConfig;
