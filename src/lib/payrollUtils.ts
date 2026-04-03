import { supabase } from './supabase';

export interface PayrollResult {
    gross: number;
    housingAllowance: number;
    taxableGross: number;
    federalTax: number;
    socialSecurity: number;
    medicare: number;
    stateTax: number;
    totalWithholding: number;
    net: number;
    employerSS: number;
    employerMedicare: number;
    totalEmployerLiability: number;
}

/**
 * Ecclesiastical Payroll Calculator
 * Handles Ministerial Housing Allowance and standard FICA/Withholding.
 */
export function calculatePayroll(
    gross: number, 
    housingAllowance: number = 0, 
    isEmployee: boolean = true,
    stateTaxRate: number = 0.05 // Default 5% for simulation
): PayrollResult {
    // If Contractor (1099), no withholding
    if (!isEmployee) {
        return {
            gross,
            housingAllowance: 0,
            taxableGross: gross,
            federalTax: 0,
            socialSecurity: 0,
            medicare: 0,
            stateTax: 0,
            totalWithholding: 0,
            net: gross,
            employerSS: 0,
            employerMedicare: 0,
            totalEmployerLiability: 0
        };
    }

    // Ministerial Housing Allowance logic:
    // It is subtracted from Taxable Gross for Federal Income Tax,
    // but usually kept for Social Security / Medicare (SECA) unless exempt.
    // For standard payroll processing (W-2), we treat it as non-taxable federal.
    const taxableGross = Math.max(0, gross - housingAllowance);
    
    // Employee Withholding (Simplified Brackets)
    const ss = gross * 0.062;
    const medicare = gross * 0.0145;
    
    // Federal Income Tax (Simplified 12% on taxable portion)
    const federalTax = taxableGross * 0.12;
    
    // State Tax
    const stateTax = taxableGross * stateTaxRate;
    
    const totalWithholding = ss + medicare + federalTax + stateTax;
    const net = gross - totalWithholding;

    // Employer Liabilities (FICA Match)
    const employerSS = gross * 0.062;
    const employerMedicare = gross * 0.0145;

    return {
        gross,
        housingAllowance,
        taxableGross,
        federalTax,
        socialSecurity: ss,
        medicare,
        stateTax,
        totalWithholding,
        net,
        employerSS,
        employerMedicare,
        totalEmployerLiability: employerSS + employerMedicare
    };
}

/**
 * Reconciles actual payroll history from the ledger for a specific period.
 */
export async function getPayrollReconciliation(churchId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('church_id', churchId)
        .eq('category', 'Payroll')
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) throw error;

    return (data || []).reduce((acc, entry) => {
        // Here we would ideally parse the detailed breakdown if stored in 'notes' or a separate table.
        // For now, we aggregate the net amounts disbursed.
        return {
            totalDisbursed: acc.totalDisbursed + Math.abs(entry.amount),
            count: acc.count + 1
        };
    }, { totalDisbursed: 0, count: 0 });
}
