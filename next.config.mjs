/** @type {import('next').NextConfig} */
const nextConfig = {
    // OWASP security headers (applied to all responses; middleware adds CSP for page routes)
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
                    { key: "X-DNS-Prefetch-Control", value: "off" },
                ],
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "i.pravatar.cc"
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com"
            },
        ],
        // Increase timeout for external images
        minimumCacheTTL: 60,
        // Add device sizes for better optimization
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        // Disable image optimization for problematic domains (fallback to unoptimized)
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    serverExternalPackages: ['mongoose'],
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
};

export default nextConfig;


