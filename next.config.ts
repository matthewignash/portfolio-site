import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  env: {
    // Expose project root to server components for reading source files.
    // __dirname in next.config.ts resolves correctly before bundling.
    PROJECT_ROOT: resolve(__dirname),
  },
};

export default nextConfig;
