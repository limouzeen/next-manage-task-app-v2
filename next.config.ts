import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lrrwvmnvbvodpyelerms.supabase.co",
        pathname: "/storage/v1/object/public/task_bk/**",
      },
    ],
  },
};

export default nextConfig;

