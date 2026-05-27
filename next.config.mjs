import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (a stray lockfile in $HOME confuses inference).
  turbopack: { root: __dirname },
};

export default nextConfig;
