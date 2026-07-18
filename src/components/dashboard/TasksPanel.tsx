import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskPriority, CreateTaskData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckSquare, Calendar, Trash2, Loader2 } from 'lucide-react';
import { CreateTaskDialog } from './CreateTaskDialog';
import { EmptyState } from '@/components/ui/empty-state';

interface TasksPanelProps {
  tasks: Task[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  onCreateTask?: (data: CreateTaskData) => void;
  isLoading?: boolean;
  isCreating?: boolean;
}

const priorityStyles: Record<TaskPriority, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground border-border'
};

const priorityLabels: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
};

export function TasksPanel({ tasks, onToggleComplete, onDelete, onCreateTask, isLoading, isCreating }: TasksPanelProps) {
  const pendingTasks = tasks.filter(t => !t.completed);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-primary" />
            Tarefas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-primary" />
            Tarefas Pendentes
            {pendingTasks.length > 0 && (
              <Badge variant="secondary">
                {pendingTasks.length}
              </Badge>
            )}
          </CardTitle>
          {onCreateTask && (
            <CreateTaskDialog 
              onCreateTask={onCreateTask} 
              isCreating={isCreating} 
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa pendente"
            description="Use o botão acima para criar uma nova tarefa."
            compact
            className="border-0 bg-transparent"
          />
        ) : (
          <ul className="space-y-3">
            {pendingTasks.slice(0, 5).map((task) => (
              <li 
                key={task.id} 
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Checkbox 
                  checked={task.completed} 
                  onCheckedChange={(checked) => onToggleComplete(task.id, checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm truncate",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1.5 py-0", priorityStyles[task.priority])}
                    >
                      {priorityLabels[task.priority]}
                    </Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}