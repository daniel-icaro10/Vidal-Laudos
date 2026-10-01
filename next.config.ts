import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
  },
  // Fotos enviadas e o banco SQLite ficam dentro do projeto: sem isso o modo dev
  // recompila e recarrega a página a cada upload/gravação.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.next/**", "**/uploads/**", "**/prisma/*.db*"],
      };
    }
    return config;
  },
};

export default nextConfig;
