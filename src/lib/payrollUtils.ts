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

export function calculatePayroll(
    periodGross: number, 
    periodHousingAllowance: number = 0, 
    isEmployee: boolean = true,
    stateResidence: string = 'TX',
    filingStatus: string = 'Single',
    dependents: number = 0,
    frequency: string = 'Monthly'
): PayrollResult {
    if (!isEmployee) {
        return {
            gross: periodGross,
            housingAllowance: 0,
            taxableGross: periodGross,
            federalTax: 0,
            socialSecurity: 0,
            medicare: 0,
            stateTax: 0,
            totalWithholding: 0,
            net: periodGross,
            employerSS: 0,
            employerMedicare: 0,
            totalEmployerLiability: 0
        };
    }

    let factor = 12;
    if (frequency === 'Weekly') factor = 52;
    if (frequency === 'Bi-weekly') factor = 26;
    if (frequency === 'Semi-monthly') factor = 24;
    if (frequency === 'Quarterly') factor = 4;
    if (frequency === 'Annually') factor = 1;

    const annualGross = periodGross * factor;
    const annualHousing = periodHousingAllowance * factor;
    
    const baseAnnualTaxable = Math.max(0, annualGross - annualHousing);
    const annualTaxableGross = Math.max(0, baseAnnualTaxable);
    
    let annualFed = 0;
    if (annualTaxableGross > 96000) annualFed = annualTaxableGross * 0.22;
    else if (annualTaxableGross > 48000) annualFed = annualTaxableGross * 0.12;
    else if (annualTaxableGross > 12000) annualFed = annualTaxableGross * 0.10;
    
    const statusMultiplier = filingStatus === 'Married' ? 0.85 : filingStatus === 'Head of Household' ? 0.90 : 1.0;
    annualFed = annualFed * statusMultiplier;
    
    const annualChildCredit = dependents * 2000;
    annualFed = Math.max(0, annualFed - annualChildCredit);
    
    const noTaxStates = ['TX', 'FL', 'NV', 'SD', 'WA', 'WY', 'AK', 'TN', 'NH'];
    const highTaxStates = ['CA', 'NY', 'HI', 'NJ', 'OR', 'MN', 'DC', 'VT', 'IA'];
    
    let stateTaxRate = 0.05; 
    if (noTaxStates.includes(stateResidence)) stateTaxRate = 0.0;
    else if (highTaxStates.includes(stateResidence)) stateTaxRate = 0.09;
    
    const annualStateTax = annualTaxableGross * stateTaxRate;
    
    const ss = periodGross * 0.062;
    const medicare = periodGross * 0.0145;
    const federalTax = annualFed / factor;
    const stateTax = annualStateTax / factor;
    
    const totalWithholding = ss + medicare + federalTax + stateTax;
    const net = periodGross - totalWithholding;

    const employerSS = periodGross * 0.062;
    const employerMedicare = periodGross * 0.0145;

    return {
        gross: periodGross,
        housingAllowance: periodHousingAllowance,
        taxableGross: annualTaxableGross / factor,
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
        return {
            totalDisbursed: acc.totalDisbursed + Math.abs(entry.amount),
            count: acc.count + 1
        };
    }, { totalDisbursed: 0, count: 0 });
}
