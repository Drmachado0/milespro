import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";
import type { Json } from '@/integrations/supabase/types';

export type AuditEventCategory = 
  | 'auth'
  | 'data_export'
  | 'data_access'
  | 'settings'
  | 'operations'
  | 'security';

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'signup'
  | 'password_change'
  | 'data_export_csv'
  | 'data_export_json'
  | 'data_export_pdf'
  | 'report_generated'
  | 'settings_updated'
  | 'operation_created'
  | 'operation_deleted'
  | 'bulk_operation'
  | 'sensitive_data_access';

interface AuditLogParams {
  eventType: AuditEventType;
  category: AuditEventCategory;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit event for security tracking
 * Uses the database function to bypass RLS for insertion
 */
export async function logAuditEvent({
  eventType,
  category,
  description,
  metadata = {},
}: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Call the database function to log the event
    const { error } = await supabase.rpc('log_audit_event', {
      _user_id: user?.id ?? '',
      _event_type: eventType,
      _event_category: category,
      _description: description || undefined,
      _metadata: JSON.parse(JSON.stringify(metadata)) as Json,
      _ip_address: undefined, // Can't get IP from client-side
      _user_agent: navigator.userAgent,
    });

    if (error) {
      logger.error('Failed to log audit event:', error);
    }
  } catch (err) {
    // Silently fail - don't break the app if audit logging fails
    logger.error('Audit logging error:', err);
  }
}

/**
 * Log authentication events
 */
export const auditAuth = {
  loginSuccess: (email: string) =>
    logAuditEvent({
      eventType: 'login_success',
      category: 'auth',
      description: `User logged in successfully`,
      metadata: { email },
    }),

  loginFailed: (email: string, reason?: string) =>
    logAuditEvent({
      eventType: 'login_failed',
      category: 'auth',
      description: `Login attempt failed`,
      metadata: { email, reason },
    }),

  logout: () =>
    logAuditEvent({
      eventType: 'logout',
      category: 'auth',
      description: 'User logged out',
    }),

  signup: (email: string) =>
    logAuditEvent({
      eventType: 'signup',
      category: 'auth',
      description: 'New user signed up',
      metadata: { email },
    }),
};

/**
 * Log data export events
 */
export const auditExport = {
  csv: (reportName: string, rowCount: number) =>
    logAuditEvent({
      eventType: 'data_export_csv',
      category: 'data_export',
      description: `Exported ${reportName} to CSV`,
      metadata: { reportName, rowCount, format: 'csv' },
    }),

  json: (reportName: string, rowCount: number) =>
    logAuditEvent({
      eventType: 'data_export_json',
      category: 'data_export',
      description: `Exported ${reportName} to JSON`,
      metadata: { reportName, rowCount, format: 'json' },
    }),

  pdf: (reportName: string) =>
    logAuditEvent({
      eventType: 'data_export_pdf',
      category: 'data_export',
      description: `Exported ${reportName} to PDF`,
      metadata: { reportName, format: 'pdf' },
    }),

  report: (reportType: string) =>
    logAuditEvent({
      eventType: 'report_generated',
      category: 'data_export',
      description: `Generated ${reportType} report`,
      metadata: { reportType },
    }),
};

/**
 * Log operation events
 */
export const auditOperations = {
  created: (operationType: string, programId?: string) =>
    logAuditEvent({
      eventType: 'operation_created',
      category: 'operations',
      description: `Created ${operationType} operation`,
      metadata: { operationType, programId },
    }),

  deleted: (operationId: string) =>
    logAuditEvent({
      eventType: 'operation_deleted',
      category: 'operations',
      description: 'Deleted operation',
      metadata: { operationId },
    }),

  bulk: (action: string, count: number) =>
    logAuditEvent({
      eventType: 'bulk_operation',
      category: 'operations',
      description: `Bulk ${action} operation`,
      metadata: { action, count },
    }),
};

/**
 * Log settings changes
 */
export const auditSettings = {
  updated: (settingType: string, changes?: Record<string, unknown>) =>
    logAuditEvent({
      eventType: 'settings_updated',
      category: 'settings',
      description: `Updated ${settingType} settings`,
      metadata: { settingType, changes },
    }),
};

/**
 * Log sensitive data access
 */
export const auditDataAccess = {
  sensitiveAccess: (dataType: string, recordId?: string) =>
    logAuditEvent({
      eventType: 'sensitive_data_access',
      category: 'data_access',
      description: `Accessed sensitive ${dataType} data`,
      metadata: { dataType, recordId },
    }),
};
