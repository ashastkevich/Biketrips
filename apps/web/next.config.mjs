/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@biketrips/api-client", "@biketrips/domain"],
  images: {
    // AVIF is noticeably smaller than WebP; browsers without it still get WebP.
    formats: ["image/avif", "image/webp"],
    // Source images are at most 1600px wide, so wider variants would only duplicate them.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async headers() {
    return [
      {
        source: "/img/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
