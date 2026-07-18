import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { queryKeys } from '@/lib/queryClient';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
}

export interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  completed?: boolean;
}

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all tasks for the user
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to ensure proper types
      return (data || []).map(task => ({
        ...task,
        completed: task.completed ?? false,
        priority: (task.priority ?? 'medium') as TaskPriority,
      })) as Task[];
    },
    enabled: !!user?.id,
  });

  // Filter helpers
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (data: CreateTaskData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description ?? null,
          due_date: data.due_date ?? null,
          priority: data.priority ?? 'medium',
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async (data: UpdateTaskData) => {
      const { id, ...updateData } = data;

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Tarefa atualizada!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Toggle complete mutation (optimistic update)
  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all);

      // Optimistically update
      queryClient.setQueryData<Task[]>(queryKeys.tasks.all, old =>
        old?.map(task =>
          task.id === id ? { ...task, completed } : task
        ) ?? []
      );

      return { previousTasks };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks);
      }
      toast.error(getSafeErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  // Delete task mutation
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Tarefa removida!');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  return {
    tasks,
    pendingTasks,
    completedTasks,
    isLoading,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
  };
}
