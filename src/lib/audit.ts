import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'EXPORT' | 'AUTH';

interface AuditParams {
    tableName: string;
    recordId: string;
    action: AuditAction;
    oldData?: any;
    newData?: any;
    churchId: string;
    userId?: string;
}

export const logActivity = async ({
    tableName,
    recordId,
    action,
    oldData,
    newData,
    churchId,
    userId
}: AuditParams) => {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                table_name: tableName,
                record_id: recordId,
                action: action,
                old_data: oldData,
                new_data: newData,
                church_id: churchId,
                user_id: userId || (await supabase.auth.getUser()).data.user?.id
            });

        if (error) throw error;
    } catch (err) {
        console.error('Forensic Audit Log failed:', err);
        // We don't block the main action if logging fails, but we record it in console
    }
};
