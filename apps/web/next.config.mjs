/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@biketrips/api-client", "@biketrips/domain"],
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
