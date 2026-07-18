import { ReactNode } from 'react';

interface TabletSplitPaneProps {
  /** Conteúdo da coluna esquerda (lista master, ~360px) */
  master: ReactNode;
  /** Conteúdo da coluna direita (detalhe, flex-1) */
  detail: ReactNode;
  /** Header sticky opcional para a coluna master */
  masterHeader?: ReactNode;
  /** Header sticky opcional para a coluna detail */
  detailHeader?: ReactNode;
  /** className adicional para o container raiz */
  className?: string;
}

/**
 * Tablet split-pane: master-list + detail layout.
 *
 * - Mobile/tablet portrait (<1024px): empilhamento vertical
 * - Tablet landscape / desktop (≥1024px): master 360px sticky + detail rolável
 *
 * Use em páginas com listas longas onde clicar num item carrega detalhe (Programas,
 * Operações, Conversas, etc.). Cada coluna rola independente em viewports maiores.
 */
export function TabletSplitPane({
  master,
  detail,
  masterHeader,
  detailHeader,
  className,
}: TabletSplitPaneProps) {
  return (
    <div
      className={[
        'flex flex-col lg:flex-row',
        'min-h-[600px] rounded-2xl border border-border bg-card overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="flex flex-col border-b border-border lg:w-[360px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        {masterHeader && (
          <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:px-5 lg:py-4">
            {masterHeader}
          </div>
        )}
        <div className="lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">{master}</div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        {detailHeader && (
          <div className="sticky top-0 z-10 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md lg:px-6 lg:py-4">
            {detailHeader}
          </div>
        )}
        <div className="flex-1 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">{detail}</div>
      </section>
    </div>
  );
}
