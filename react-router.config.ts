// ============================================
// FILE: react-router.config.ts
// ============================================
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  async prerender() {
    return ["/login"];
  },
} satisfies Config;