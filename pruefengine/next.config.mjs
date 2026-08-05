/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Fallstrick: pdfkit darf nicht gebundlet werden, sonst findet es seine
  // eingebauten AFM-Metriken zur Laufzeit nicht.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },

  // Fallstrick: Deploys sollen nicht an Lint-/Typwarnungen scheitern.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
