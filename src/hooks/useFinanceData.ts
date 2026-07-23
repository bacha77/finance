import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface FinanceStats {
    balance: number;
    ytdIncome: number;
    ytdExpenses: number;
    membersCount: number;
    incomeChange: number | null;
    expenseChange: number | null;
    balanceChange: number | null;
    totalAssets: number;
    budgetUtilization: { name: string, spent: number, budget: number, percentage: number }[];
}

export const useFinanceData = (churchId: string | null) => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [funds, setFunds] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!churchId) return;
        setIsLoading(true);
        try {
            const [
                { data: ledgerData },
                { data: fundsData },
                { data: membersData }
            ] = await Promise.all([
                supabase.from('ledger').select('*').eq('church_id', churchId).neq('voided', true).order('date', { ascending: false }),
                supabase.from('funds').select('*').eq('church_id', churchId),
                supabase.from('members').select('id').eq('church_id', churchId)
            ]);

            setLedger(ledgerData ? ledgerData.filter((t: any) => t.category !== 'Payroll') : []);
            setFunds(fundsData || []);
            setMembers(membersData || []);
        } catch (err) {
            console.error('Error fetching finance data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!churchId) return;
        fetchData();

        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `church_id=eq.${churchId}` }, () => {
                console.log('Ledger change detected, syncing dashboard...');
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'funds', filter: `church_id=eq.${churchId}` }, () => {
                console.log('Fund balance change detected, syncing dashboard...');
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [churchId]);

    const stats = useMemo((): FinanceStats => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const prevYear = currentYear - 1;

        // 1. All-time Balance (Sum of all signed amounts in ledger)
        const totalBalance = ledger.reduce((s, t) => s + (t.amount || 0), 0);
        
        // 2. Total Assets (Sum of all fund balances - cross-check)
        const totalAssets = funds.reduce((s, f) => s + (f.balance || 0), 0);

        // 3. Current Year Totals (YTD)
        const ytdLedger = ledger.filter(t => {
            const d = new Date(t.date || t.created_at);
            return d.getFullYear() === currentYear;
        });

        const ytdIncome = ytdLedger
            .filter(t => t.type === 'in' || t.type === 'revenue')
            .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

        const ytdExpenses = ytdLedger
            .filter(t => t.type === 'out' || t.type === 'expense')
            .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

        // 4. Previous Year Totals (for growth, comparing full previous year, or YTD of previous year)
        // To be perfectly accurate we would compare against YTD last year. For simplicity here we just use last year.
        const prevYearLedger = ledger.filter(t => {
            const d = new Date(t.date || t.created_at);
            return d.getFullYear() === prevYear;
        });

        const prevIncome = prevYearLedger
            .filter(t => t.type === 'in' || t.type === 'revenue')
            .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

        const prevExpenses = prevYearLedger
            .filter(t => t.type === 'out' || t.type === 'expense')
            .reduce((s, t) => s + Math.abs(t.amount || 0), 0);

        // 5. Growth Rates (Compare against previous year)
        const incomeChange = prevIncome > 0 ? ((ytdIncome - prevIncome) / prevIncome) * 100 : null;
        const expenseChange = prevExpenses > 0 ? ((ytdExpenses - prevExpenses) / prevExpenses) * 100 : null;
        
        const currentSurplus = ytdIncome - ytdExpenses;
        const prevSurplus = prevIncome - prevExpenses;
        const balanceChange = prevSurplus !== 0 ? ((currentSurplus - prevSurplus) / Math.abs(prevSurplus)) * 100 : null;

        return {
            balance: totalBalance,
            ytdIncome,
            ytdExpenses,
            membersCount: members.length,
            incomeChange,
            expenseChange,
            balanceChange,
            totalAssets,
            budgetUtilization: funds.map(f => ({
                name: f.name,
                spent: Math.abs(ledger.filter(t => t.fund_id === f.id && (t.type === 'out' || t.type === 'expense')).reduce((s, t) => s + Math.abs(t.amount || 0), 0)),
                budget: f.budget_amount || 1000, // Default fallback if no budget set
                percentage: ((Math.abs(ledger.filter(t => t.fund_id === f.id && (t.type === 'out' || t.type === 'expense')).reduce((s, t) => s + Math.abs(t.amount || 0), 0))) / (f.budget_amount || 1000)) * 100
            }))
        };
    }, [ledger, funds, members]);

    return { ledger, funds, members, stats, isLoading, refresh: fetchData };
};
