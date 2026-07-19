import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// SEC-03 / SEC-04: failOnSecretLeak() guards the production bundle.
// - FORBIDDEN_VITE_PATTERNS: any matching VITE_* env var would be inlined into
//   the client bundle by Vite's define substitution — refuse to build.
// - Supabase public config is publish-safe and has managed defaults below so
//   Lovable-hosted production builds do not fail when .env is not injected.
// PITFALL 4 (RESEARCH §745-753): use `process.env` (Node) NOT `import.meta.env`
// (Vite client substitution). Only OS-level env vars (CI/Vercel/dev shell)
// trigger the guard — exactly the threat surface we care about.
const FORBIDDEN_VITE_PATTERNS: readonly RegExp[] = [
  /^VITE_.*SERVICE_ROLE/i,
  /^VITE_.*SECRET_KEY/i,
  /^VITE_.*WEBHOOK_SECRET/i,
  /^VITE_.*PRIVATE_KEY/i,
  // Phase 2 (Asaas) — D-27 preventive guard. Asaas API key + webhook token
  // MUST live in `supabase secrets set ASAAS_API_KEY=... ASAAS_WEBHOOK_TOKEN=...`
  // (Deno edge runtime), NEVER in `import.meta.env.VITE_*`.
  /^VITE_ASAAS_.*SECRET/i,
  /^VITE_ASAAS_.*WEBHOOK/i,
  /^VITE_ASAAS_.*API.?KEY/i,
];

const REQUIRED_VITE_VARS: readonly string[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
];

// MilesPro's own Supabase project (sa-east-1), post-Lovable migration.
// Publish-safe fallback used only when env vars are absent at build time.
const MANAGED_SUPABASE_CONFIG = {
  url: 'https://ermpialrzbnyfkatrxeq.supabase.co',
  publishableKey: 'sb_publishable_hmPMM3OvurGYpcGjnBSqVA_uZ6vXFNe',
  projectId: 'ermpialrzbnyfkatrxeq',
} as const;

const isLegacyJwtKey = (value?: string) => Boolean(value?.startsWith('eyJhbGciOi'));
const usePublishableKey = (...candidates: Array<string | undefined>) =>
  candidates.find((value) => value && !isLegacyJwtKey(value)) ?? MANAGED_SUPABASE_CONFIG.publishableKey;

function failOnSecretLeak(env: Record<string, string>): Plugin {
  return {
    name: 'milespro:fail-on-secret-leak',
    config(_, { command }) {
      // Only enforce on build (not dev) so DX stays clean.
      if (command !== 'build') return;

      // OS-level env vars only (process.env) — .env files are sandbox-managed
      // and not the leak threat surface.
      const dangerous = Object.keys(process.env).filter((k) =>
        FORBIDDEN_VITE_PATTERNS.some((re) => re.test(k)),
      );
      if (dangerous.length > 0) {
        throw new Error(
          `[failOnSecretLeak] Refusing to build. ` +
          `Dangerous VITE_* env vars detected (would ship to client bundle): ` +
          dangerous.join(', '),
        );
      }

      // Required vars may come from process.env, Lovable-managed .env, or the
      // publish-safe managed defaults injected before this plugin is created.
      const missing = REQUIRED_VITE_VARS.filter((k) => !env[k]);
      if (missing.length > 0) {
        throw new Error(
          `[failOnSecretLeak] Refusing to build. ` +
          `Required env vars missing: ${missing.join(', ')}. ` +
          `Set these in your CI/host config or update MANAGED_SUPABASE_CONFIG.`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Merge .env files with process.env (process.env wins) so Lovable-managed
  // .env values and CI/Vercel env vars both contribute. `failOnSecretLeak()`
  // (plugin below) is the gate that aborts the build when the merged env is
  // missing one of REQUIRED_VITE_VARS — there is NO silent fallback anymore
  // (Phase 1 AR-2 closure: see 02-CONTEXT.md D-25).
  const rawEnv = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;

  // Defensive trim: dashboards (Vercel/Lovable) sometimes save env vars with
  // leading/trailing whitespace pasted from chat or terminals, which inline
  // into the bundle and break URL-encoded query strings (Realtime WebSocket
  // sends `apikey=%20sb_publishable_...` → backend rejects with 401).
  // Empty strings stay empty; null/undefined stay null/undefined.
  const env = Object.fromEntries(
    Object.entries(rawEnv).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  ) as Record<string, string>;

  // Allow SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY (CI alt names)
  // to feed the canonical VITE_* names; fall back only to publish-safe managed
  // values and never reuse revoked legacy JWT anon keys.
  env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || MANAGED_SUPABASE_CONFIG.url;
  env.VITE_SUPABASE_PUBLISHABLE_KEY = usePublishableKey(
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON_KEY,
  );
  env.VITE_SUPABASE_PROJECT_ID =
    env.VITE_SUPABASE_PROJECT_ID ||
    env.SUPABASE_PROJECT_ID ||
    (env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? MANAGED_SUPABASE_CONFIG.projectId);

  // If any of these are still empty, failOnSecretLeak()'s REQUIRED check below
  // will throw with the exact missing key names. Reaching the `define` block
  // with empty strings is guaranteed never to happen at build time.
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID;

  return ({
  define: {
    // Inject Supabase config at build time so the published bundle never has
    // `import.meta.env.VITE_SUPABASE_URL === undefined`.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    // FIRST plugin — fail-fastest before any other plugin does work.
    failOnSecretLeak(env),
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer', // Defer SW registration to not block TTI
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'MilesPro - Gestão de Milhas Aéreas',
        short_name: 'MilesPro',
        description: 'Plataforma completa para gerenciamento de milhas aéreas e pontos de fidelidade',
        theme_color: '#e8590c',
        background_color: '#f5f7fa',
        display: 'standalone',
        categories: ['finance', 'travel', 'productivity'],
        shortcuts: [
          {
            name: 'Simulador',
            short_name: 'Simular',
            url: '/simulador',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Minhas Milhas',
            short_name: 'Milhas',
            url: '/cartoes',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // API calls - Network first with fallback to cache
          {
            urlPattern: /^https:\/\/opusftqbbaozucmbuuug\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Auth endpoints - Network only (no caching for security)
          {
            urlPattern: /^https:\/\/opusftqbbaozucmbuuug\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          // Edge functions - Network first with short cache
          {
            urlPattern: /^https:\/\/opusftqbbaozucmbuuug\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'functions-cache',
              networkTimeoutSeconds: 15,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Storage/images from Supabase - Cache first
          {
            urlPattern: /^https:\/\/opusftqbbaozucmbuuug\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Local images - Cache first with long expiry
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Fonts - Cache first (fonts rarely change)
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // JS/CSS chunks - Stale while revalidate for quick loads
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge", "zod"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
    ],
  },
  });
});
