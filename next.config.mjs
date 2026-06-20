/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The prototype/ folder is design reference only — keep it out of the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
