import { memo } from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProgramBalance } from '@/hooks/useProgramBalances';
import { ProgramCardMemo } from './ProgramCardMemo';
import { EmptyState } from '@/components/ui/empty-state';

interface CategoryTabContentProps {
  items: ProgramBalance[];
  icon: LucideIcon;
  iconColor: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  category?: 'pontos' | 'cias' | 'hoteis';
}

const CATEGORY_EMPTY_STATES = {
  pontos: {
    title: 'Nenhum programa de pontos cadastrado',
    description: 'Adicione seus programas de fidelidade para acompanhar saldos e calcular economia.',
    actionLabel: 'Adicionar Programa',
    actionHref: '/lancamentos/entrada',
  },
  cias: {
    title: 'Nenhuma companhia aérea cadastrada',
    description: 'Registre suas milhas aéreas para visualizar saldos e acompanhar vencimentos.',
    actionLabel: 'Registrar Milhas',
    actionHref: '/lancamentos/entrada',
  },
  hoteis: {
    title: 'Nenhuma rede de hotéis cadastrada',
    description: 'Adicione seus programas de hotéis para acompanhar pontos e benefícios.',
    actionLabel: 'Cadastrar Rede de Hotéis',
    actionHref: '/sistema/programas',
  },
};

function CategoryTabContent({
  items,
  icon: Icon,
  iconColor,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  category,
}: CategoryTabContentProps) {
  const navigate = useNavigate();
  
  const defaultEmpty = category ? CATEGORY_EMPTY_STATES[category] : null;
  const title = emptyTitle || defaultEmpty?.title || 'Nenhum dado encontrado';
  const description = emptyDescription || defaultEmpty?.description || 'Adicione dados para visualizar aqui.';
  const actionLabel = emptyActionLabel || defaultEmpty?.actionLabel;
  const actionHref = emptyActionHref || defaultEmpty?.actionHref;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={actionHref ? () => navigate(actionHref) : undefined}
        iconClassName={iconColor}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((program, index) => (
        <div
          key={program.program}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProgramCardMemo program={program} />
        </div>
      ))}
    </div>
  );
}

export const CategoryTabContentMemo = memo(CategoryTabContent);
export { CategoryTabContent };
