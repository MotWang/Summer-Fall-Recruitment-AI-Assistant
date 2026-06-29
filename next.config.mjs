/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // better-sqlite3 是原生模块，需要交给 Node runtime
    serverComponentsExternalPackages: ["better-sqlite3", "pdf-parse"],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ "better-sqlite3": "commonjs better-sqlite3" });
    return config;
  },
};

export default nextConfig;
