/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "192.168.100.169", "0.0.0.0"],
  async headers() {
    return [
      {
        source: '/:all*(mp4|jpg|jpeg|png|svg|webp|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
