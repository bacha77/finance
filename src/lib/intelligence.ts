/**
 * Storehouse Finance — Neural Intelligence Utilities
 * Handles forecasting, data analysis, and predictive modeling.
 */

interface Transaction {
    amount: number;
    date: string;
    type: 'in' | 'out';
}

/**
 * Predicts next month's net balance based on historical trends.
 * Uses a weighted average where recent months have more influence.
 */
export const predictNextMonth = (ledger: Transaction[]) => {
    if (!ledger || ledger.length < 5) return null;

    // Group by month
    const monthlyData: Record<string, { in: number; out: number }> = {};
    
    ledger.forEach(tx => {
        const date = new Date(tx.date || (tx as any).created_at);
        if (isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[key]) monthlyData[key] = { in: 0, out: 0 };
        
        if (tx.type === 'in') monthlyData[key].in += tx.amount;
        else monthlyData[key].out += tx.amount;
    });

    const months = Object.keys(monthlyData).sort();
    if (months.length < 2) return null;

    // Calculate month-over-month growth/trends
    let predictedIn = 0;
    let predictedOut = 0;
    let weightSum = 0;

    months.forEach((key, index) => {
        const weight = index + 1; // More recent months have higher weight
        predictedIn += monthlyData[key].in * weight;
        predictedOut += monthlyData[key].out * weight;
        weightSum += weight;
    });

    return {
        income: Math.round(predictedIn / weightSum),
        expense: Math.round(predictedOut / weightSum),
        confidence: months.length > 6 ? 0.9 : 0.7
    };
};

/**
 * Detects financial anomalies (e.g., unusually high expenses).
 */
export const detectAnomalies = (ledger: Transaction[], language: string = 'en-US') => {
    if (ledger.length < 10) return [];
    
    const avgExpense = ledger
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0) / ledger.filter(t => t.type === 'out').length;
    
    return ledger
        .filter(t => t.type === 'out' && t.amount > avgExpense * 2.5)
        .map(t => ({
            ...t,
            reason: 'High spike detected ( > 2.5x average)',
            formattedDate: new Date((t.date || (t as any).created_at) || new Date()).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        }));
};
