import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Backend servisleri hem yerelde (localhost:5xxx) hem prod'da (*.hekimburada.com alt
    // alan adlarında) yüklenen görselleri serviyor — next/image optimizasyonu için ikisi de
    // izinli host listesine eklendi.
    remotePatterns: [
      { protocol: "https", hostname: "*.hekimburada.com" },
      { protocol: "https", hostname: "hekimburada.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
