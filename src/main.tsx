import { createRoot } from "react-dom/client";
import "./index.css";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";
import { initPosthog } from "@/lib/posthog";

// Sentry: legitimate interest (LGPD Art. 7 IX) — init at boot, no consent
// gate. PII is scrubbed via beforeSend (see src/lib/sentry.ts scrubPII).
initSentry();

// PostHog: init in opt-out-by-default mode. ConsentWatcher (mounted inside
// the React tree in App.tsx) flips opt-in once the user submits ConsentBanner
// with Analytics checked (see useConsent().analyticsOptedIn → Plan 02-02 W1a).
// Gate G-HIGH-03: zero requests to eu.i.posthog.com must fire before consent.
initPosthog();

// Expose logger globally for legacy call sites
(globalThis as typeof globalThis & { logger: typeof logger }).logger = logger;

const FALLBACK_HTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',system-ui,-apple-system,sans-serif;background:#f5f7fa;color:#171717;">
    <div style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e5e7ef;border-radius:12px;padding:28px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#f97316,#ea580c);margin:0 auto 16px;"></div>
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Não foi possível iniciar o aplicativo</h1>
      <p style="font-size:14px;color:#525252;margin:0 0 20px;line-height:1.5;">
        Ocorreu um erro ao carregar. Isso pode ser causado por cache antigo do navegador.
        Tente recarregar a página.
      </p>
      <button onclick="(function(){try{if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}}catch(e){}window.location.reload()})()" style="background:#e8590c;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">
        Recarregar
      </button>
    </div>
  </div>
`;

function renderFallback(err?: unknown) {
  try {
    if (import.meta.env.DEV) {
      logger.error("[bootstrap] Failed to start app:", err);
    }
    const root = document.getElementById("root");
    if (root) root.innerHTML = FALLBACK_HTML;
  } catch {
    // last resort: do nothing
  }
}

async function bootstrap() {
  try {
    const { default: App } = await import("./App");
    const container = document.getElementById("root");
    if (!container) throw new Error("Root container not found");
    createRoot(container).render(<App />);
    // Signal successful mount to index.html skeleton remover
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("app:mounted"));
    });
  } catch (err) {
    renderFallback(err);
  }
}

window.addEventListener("error", (e) => {
  if (!document.getElementById("root")?.hasChildNodes() || document.getElementById("initial-skeleton")) {
    // only intercept if we never mounted
    if (e.error) renderFallback(e.error);
  }
});

bootstrap();
