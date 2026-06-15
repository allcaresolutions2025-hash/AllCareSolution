/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress responses with gzip/brotli at the edge.
  compress: true,

  // Strip console.* calls from production bundles to keep them lean.
  // Errors and warnings remain so we don't lose diagnostic noise.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // Tree-shake heavy packages so each page only ships the icons/utilities
  // it actually uses. `lucide-react` alone is ~1MB unshaken; with this set,
  // each page typically ships <50KB of icon code.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },

  // Serve product images as AVIF/WebP where the browser supports them —
  // typically 30-50% smaller than JPEG/PNG.
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
