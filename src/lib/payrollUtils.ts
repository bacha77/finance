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
    stateResidence: string = 'TX',
    filingStatus: string = 'Single',
    dependents: number = 0
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
    const baseTaxableGross = Math.max(0, gross - housingAllowance);
    
    // 1. Dependent Deduction ($166 per dependent per month approximation)
    const dependentDeduction = dependents * 166.66;
    
    // 2. Filing Status Multiplier (Married usually pays slightly less percentage-wise)
    const statusMultiplier = filingStatus === 'Married' ? 0.85 : filingStatus === 'Head of Household' ? 0.90 : 1.0;
    
    // Final Taxable Gross for Federal/State
    const taxableGross = Math.max(0, baseTaxableGross - dependentDeduction);
    
    // FICA Taxes (Based on full gross)
    const ss = gross * 0.062;
    const medicare = gross * 0.0145;
    
    // Federal Income Tax (Simulated Progressive Bracket)
    let federalTax = 0;
    if (taxableGross > 8000) { federalTax = taxableGross * 0.22; }
    else if (taxableGross > 4000) { federalTax = taxableGross * 0.12; }
    else if (taxableGross > 1000) { federalTax = taxableGross * 0.10; }
    
    federalTax = federalTax * statusMultiplier;
    
    // State Tax (Simulated by State)
    const noTaxStates = ['TX', 'FL', 'NV', 'SD', 'WA', 'WY', 'AK', 'TN', 'NH'];
    const highTaxStates = ['CA', 'NY', 'HI', 'NJ', 'OR', 'MN', 'DC', 'VT', 'IA'];
    
    let stateTaxRate = 0.05; // Default middle ground for the other 32 states
    if (noTaxStates.includes(stateResidence)) stateTaxRate = 0.0;
    else if (highTaxStates.includes(stateResidence)) stateTaxRate = 0.09;
    
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
