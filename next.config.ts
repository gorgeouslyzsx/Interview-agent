import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/files/extract-text": [
      "./node_modules/@napi-rs/canvas*/**/*",
      "./node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
