import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ALL_QUICK_ACTIONS,
  CATEGORY_LABELS,
  getActionsByIds,
  filterQuickActionsByTier,
  MAX_QUICK_ACTIONS,
  MIN_QUICK_ACTIONS,
  QuickActionDefinition,
  DEFAULT_QUICK_ACTIONS,
} from '@/data/quickActionsRegistry';
import { useLocalization } from '@/hooks/useLocalization';
import { useProductTier } from '@/hooks/useProductTier';
import { cn } from '@/lib/utils';
import { GripVertical, RotateCcw, Check, X } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

interface EditQuickActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  isSaving?: boolean;
}

export function EditQuickActionsDialog({
  open,
  onOpenChange,
  selectedIds,
  onSave,
  isSaving = false,
}: EditQuickActionsDialogProps) {
  const { t } = useLocalization();
  const { productTier } = useProductTier();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Only offer actions the user's product tier can actually reach.
  const availableActions = filterQuickActionsByTier(ALL_QUICK_ACTIONS, productTier);

  // Sync with external state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSelectedIds(selectedIds);
    }
  }, [open, selectedIds]);

  const handleToggle = (actionId: string) => {
    setLocalSelectedIds(prev => {
      const isSelected = prev.includes(actionId);
      if (isSelected) {
        if (prev.length <= MIN_QUICK_ACTIONS) return prev;
        return prev.filter(id => id !== actionId);
      } else {
        if (prev.length >= MAX_QUICK_ACTIONS) return prev;
        return [...prev, actionId];
      }
    });
  };

  const handleReorder = (newOrder: string[]) => {
    setLocalSelectedIds(newOrder);
  };

  const handleSave = () => {
    onSave(localSelectedIds);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalSelectedIds(DEFAULT_QUICK_ACTIONS);
  };

  const selectedActions = getActionsByIds(localSelectedIds);
  const categories = ['operations', 'strategies', 'management', 'tools', 'agency'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Personalizar Ações Rápidas
          </DialogTitle>
          <DialogDescription>
            Escolha e organize as ações que aparecem no seu dashboard. 
            Mínimo {MIN_QUICK_ACTIONS}, máximo {MAX_QUICK_ACTIONS} ações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Selected Actions Preview with Drag */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Selecionadas ({localSelectedIds.length}/{MAX_QUICK_ACTIONS})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar Padrão
              </Button>
            </div>
            
            <Reorder.Group
              axis="x"
              values={localSelectedIds}
              onReorder={handleReorder}
              className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border min-h-[60px]"
            >
              {selectedActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Reorder.Item
                    key={action.id}
                    value={action.id}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border',
                        'bg-gradient-to-br shadow-sm',
                        action.colorClass
                      )}
                    >
                      <GripVertical className="h-3 w-3 opacity-50" />
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium whitespace-nowrap">
                        {t(action.labelKey)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(action.id);
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-background/50 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>

          {/* All Actions by Category */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {categories.map(category => {
                const categoryActions = availableActions.filter(a => a.category === category);
                if (categoryActions.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_LABELS[category]}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoryActions.map(action => {
                        const Icon = action.icon;
                        const isSelected = localSelectedIds.includes(action.id);
                        const isDisabled = !isSelected && localSelectedIds.length >= MAX_QUICK_ACTIONS;

                        return (
                          <button
                            key={action.id}
                            onClick={() => handleToggle(action.id)}
                            disabled={isDisabled}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all',
                              'hover:scale-[1.02] active:scale-[0.98]',
                              isSelected
                                ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                                : 'bg-card border-border hover:bg-accent/50',
                              isDisabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                            )}
                          >
                            <div className={cn(
                              'p-1.5 rounded-md',
                              isSelected ? 'bg-primary/20' : 'bg-muted'
                            )}>
                              <Icon className={cn(
                                'h-4 w-4',
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              )} />
                            </div>
                            <span className={cn(
                              'text-xs font-medium flex-1 truncate',
                              isSelected ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {t(action.labelKey)}
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
