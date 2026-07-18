import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
import { useQuickActions } from '@/hooks/useQuickActions';
import { EditQuickActionsDialog } from '@/components/dashboard/EditQuickActionsDialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { 
    actions, 
    selectedActionIds, 
    isLoading, 
    isSaving,
    updateActions 
  } = useQuickActions();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            {t('dashboard.quickActions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              {t('dashboard.quickActions')}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditDialogOpen(true)}
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className={cn(
                    'group/btn h-auto p-4 flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl',
                    'ring-1 ring-black/5 dark:ring-white/5 group-hover/btn:ring-primary/20',
                    'hover:scale-105 active:scale-95 transition-all duration-200',
                    'shadow-sm hover:shadow-md bg-gradient-to-br',
                    action.colorClass,
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(action.path)}
                >
                  <div className="p-1.5 sm:p-2 rounded-full bg-background/80 shadow-sm">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight line-clamp-2">
                    {t(action.labelKey)}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditQuickActionsDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selectedIds={selectedActionIds}
        onSave={updateActions}
        isSaving={isSaving}
      />
    </>
  );
}
