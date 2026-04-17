/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "untraceried-braxton-semirarely.ngrok-free.dev",
  ],
    typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
