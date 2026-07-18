/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Plan 02-06 D-15: VITE_SALES_WHATSAPP removed — VIP self-serve via Asaas.
  readonly VITE_ENABLE_SUBSCRIPTION_LEADS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const logger: {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};
