import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 자동 메모이제이션 → 불필요한 리렌더 감소
  reactCompiler: true,
};

export default nextConfig;
