/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@biketrips/api-client", "@biketrips/domain"],
  images: {
    // AVIF is noticeably smaller than WebP; browsers without it still get WebP.
    formats: ["image/avif", "image/webp"],
    // Source images are at most 1600px wide, so wider variants would only duplicate them.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Next 16 rejects local images with a query string unless a pattern allows it; uploaded
    // covers carry their upload version (?v=...), static images never have one.
    localPatterns: [
      { pathname: "/img/**", search: "" },
      { pathname: "/api/trips/*/cover-image" },
      { pathname: "/api/trips/*/pending-cover-image" },
    ],
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
