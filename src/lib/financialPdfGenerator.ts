import jsPDF from 'jspdf';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export const generateFinancialStatement = (
    churchName: string,
    ledger: any[],
    funds: any[]
) => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFont('helvetica');

    let cursorY = 50;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(churchName || 'Organization', 50, cursorY);
    
    cursorY += 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Statement of Financial Position (Balance Sheet)', 50, cursorY);
    
    cursorY += 15;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, cursorY);
    doc.setTextColor(0, 0, 0);

    cursorY += 30;

    // --- Balance Sheet (Funds) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSETS & FUND BALANCES', 50, cursorY);
    cursorY += 20;

    let totalBalance = 0;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    funds.forEach(fund => {
        doc.text(fund.name, 60, cursorY);
        doc.text(fmt(fund.balance), 500, cursorY, { align: 'right' });
        totalBalance += fund.balance;
        cursorY += 15;
    });

    cursorY += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(50, cursorY, 500, cursorY);
    cursorY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL FUND BALANCES', 60, cursorY);
    doc.text(fmt(totalBalance), 500, cursorY, { align: 'right' });
    
    cursorY += 50;

    // --- Income Statement (P&L) ---
    doc.setFontSize(14);
    doc.text('Statement of Activities (Income & Expense)', 50, cursorY);
    cursorY += 30;

    // Calculate P&L from Ledger
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    ledger.forEach(tx => {
        if (tx.type === 'transfer') return; // Transfers don't hit P&L
        
        if (tx.amount > 0 || tx.type === 'in' || tx.type === 'revenue') {
            totalIncome += Math.abs(tx.amount);
            incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + Math.abs(tx.amount);
        } else if (tx.amount < 0 || tx.type === 'out' || tx.type === 'expense') {
            totalExpense += Math.abs(tx.amount);
            expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + Math.abs(tx.amount);
        }
    });

    // INCOME
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE', 50, cursorY);
    cursorY += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    Object.keys(incomeByCategory).forEach(cat => {
        doc.text(cat || 'Uncategorized', 60, cursorY);
        doc.text(fmt(incomeByCategory[cat]), 500, cursorY, { align: 'right' });
        cursorY += 15;
    });

    cursorY += 10;
    doc.line(50, cursorY, 500, cursorY);
    cursorY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL REVENUE', 60, cursorY);
    doc.text(fmt(totalIncome), 500, cursorY, { align: 'right' });
    cursorY += 30;

    // EXPENSES
    doc.setFontSize(12);
    doc.text('EXPENSES', 50, cursorY);
    cursorY += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    Object.keys(expenseByCategory).forEach(cat => {
        // Simple page break check
        if (cursorY > 700) {
            doc.addPage();
            cursorY = 50;
        }

        doc.text(cat || 'Uncategorized', 60, cursorY);
        doc.text(fmt(expenseByCategory[cat]), 500, cursorY, { align: 'right' });
        cursorY += 15;
    });

    cursorY += 10;
    doc.line(50, cursorY, 500, cursorY);
    cursorY += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL EXPENSES', 60, cursorY);
    doc.text(fmt(totalExpense), 500, cursorY, { align: 'right' });
    cursorY += 30;

    // NET
    const netIncome = totalIncome - totalExpense;
    doc.setFontSize(14);
    doc.text('NET REVENUE', 50, cursorY);
    doc.text(fmt(netIncome), 500, cursorY, { align: 'right' });

    doc.save(`Financial_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
};
