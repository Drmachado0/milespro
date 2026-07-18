import { useLocation } from "react-router-dom";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Erro
          </span>
        </div>
        <h1 className="mb-2 font-mono text-7xl font-bold tabular-nums tracking-tight text-foreground">
          404
        </h1>
        <p className="mb-2 text-xl font-semibold text-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">
          A rota <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> não existe ou foi movida.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
