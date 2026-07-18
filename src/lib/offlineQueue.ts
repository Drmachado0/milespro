import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PendingOperation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

const QUEUE_KEY = 'milespro_pending_operations';
const MAX_RETRIES = 3;

// Get all pending operations from localStorage
export const getPendingOperations = (): PendingOperation[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save pending operations to localStorage
const savePendingOperations = (operations: PendingOperation[]): void => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(operations));
};

// Add a new operation to the queue
export const queueOperation = (
  table: string,
  action: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>
): string => {
  const operations = getPendingOperations();
  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  operations.push({
    id,
    table,
    action,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  });
  
  savePendingOperations(operations);
  logger.log('[OfflineQueue]', `Queued ${action} operation for ${table}`, id);
  
  return id;
};

// Remove an operation from the queue
export const removeOperation = (id: string): void => {
  const operations = getPendingOperations();
  const filtered = operations.filter(op => op.id !== id);
  savePendingOperations(filtered);
};

// Process a single operation
const processOperation = async (operation: PendingOperation): Promise<boolean> => {
  logger.log('[OfflineQueue]', `Processing ${operation.action} on ${operation.table}`, operation.id);
  
  try {
    let result;
    
    switch (operation.action) {
      case 'insert':
        result = await supabase.from(operation.table as 'operations').insert(operation.data as never);
        break;
      case 'update': {
        const { id: recordId, ...updateData } = operation.data;
        result = await supabase.from(operation.table as 'operations').update(updateData as never).eq('id', recordId as string);
        break;
      }
      case 'delete':
        result = await supabase.from(operation.table as 'operations').delete().eq('id', operation.data.id as string);
        break;
    }
    
    if (result?.error) {
      logger.error('[OfflineQueue]', 'Error processing operation:', result.error);
      return false;
    }
    
    logger.log('[OfflineQueue]', `Successfully processed ${operation.id}`);
    return true;
  } catch (error) {
    logger.error('[OfflineQueue]', 'Failed to process operation:', error);
    return false;
  }
};

// Sync all pending operations
export const syncPendingOperations = async (): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> => {
  const operations = getPendingOperations();
  
  if (operations.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }
  
  logger.log('[OfflineQueue]', `Starting sync of ${operations.length} pending operations`);
  
  let synced = 0;
  let failed = 0;
  const remaining: PendingOperation[] = [];
  
  for (const operation of operations) {
    const success = await processOperation(operation);
    
    if (success) {
      synced++;
    } else {
      operation.retryCount++;
      
      if (operation.retryCount < MAX_RETRIES) {
        remaining.push(operation);
      } else {
        failed++;
        logger.warn('[OfflineQueue]', `Operation ${operation.id} exceeded max retries, discarding`);
      }
    }
  }
  
  savePendingOperations(remaining);
  
  logger.log('[OfflineQueue]', `Sync complete: ${synced} synced, ${failed} failed, ${remaining.length} remaining`);
  
  return { synced, failed, remaining: remaining.length };
};

// Check if we have pending operations
export const hasPendingOperations = (): boolean => {
  return getPendingOperations().length > 0;
};

// Get count of pending operations
export const getPendingCount = (): number => {
  return getPendingOperations().length;
};

// Clear all pending operations (use with caution)
export const clearPendingOperations = (): void => {
  localStorage.removeItem(QUEUE_KEY);
  logger.log('[OfflineQueue]', 'Cleared all pending operations');
};
