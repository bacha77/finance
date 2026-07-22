import React, { useState, useMemo } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { Download, Printer, Search, Calendar } from 'lucide-react';

interface TaxStatementsProps {
    churchId: string;
    churchName: string;
}

const TaxStatements: React.FC<TaxStatementsProps> = ({ churchId, churchName }) => {
    const { ledger, members, isLoading } = useFinanceData(churchId);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const years = useMemo(() => {
        const uniqueYears = new Set(ledger.map(tx => new Date(tx.date || tx.created_at || '').getFullYear()));
        return Array.from(uniqueYears).sort((a, b) => b - a);
    }, [ledger]);

    const memberStatements = useMemo(() => {
        const yearLedger = ledger.filter(tx => {
            const d = new Date(tx.date || tx.created_at || '');
            return d.getFullYear() === selectedYear && tx.type === 'in';
        });

        const statements: Record<string, { member: any, total: number, transactions: any[] }> = {};

        yearLedger.forEach(tx => {
            const memberId = tx.member;
            if (!memberId) return;

            const memberObj = members.find(m => m.id === memberId || m.name === memberId);
            const memberName = memberObj ? memberObj.name : memberId;
            const key = memberObj ? memberObj.id : memberName;

            if (!statements[key]) {
                statements[key] = {
                    member: memberObj || { name: memberName },
                    total: 0,
                    transactions: []
                };
            }

            statements[key].total += Number(tx.amount);
            statements[key].transactions.push(tx);
        });

        return Object.values(statements).filter(s => s.member.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [ledger, members, selectedYear, searchTerm]);

    const printStatement = (statement: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Tax Statement - ${statement.member.name}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
                    .header { text-align: center; margin-bottom: 40px; }
                    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
                    .header p { margin: 0; color: #64748b; }
                    .donor-info { margin-bottom: 40px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    th { background-color: #f8fafc; font-weight: 600; }
                    .total { font-weight: bold; font-size: 18px; text-align: right; padding-top: 20px; }
                    .disclaimer { font-size: 12px; color: #64748b; text-align: center; margin-top: 60px; font-style: italic; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${churchName}</h1>
                    <p>Annual Giving Statement - ${selectedYear}</p>
                </div>
                
                <div class="donor-info">
                    <strong>Prepared For:</strong><br/>
                    ${statement.member.name}<br/>
                    ${statement.member.email ? statement.member.email : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${statement.transactions.map((tx: any) => `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString()}</td>
                                <td>${tx.description || ''}</td>
                                <td>${tx.category || ''}</td>
                                <td>$${Number(tx.amount).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total">
                    Total Tax-Deductible Contributions: $${statement.total.toFixed(2)}
                </div>

                <div class="disclaimer">
                    No goods or services were provided by ${churchName} in return for these contributions other than intangible religious benefits. Please retain this statement for your tax records.
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for styles to load then print
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };

    if (isLoading) return <div>Loading statements...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>End-of-Year Tax Statements</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Generate IRS-compliant giving statements for donors.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <select 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(parseInt(e.target.value))}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                        >
                            {years.map(y => <option key={y} value={y} style={{ color: 'black' }}>{y}</option>)}
                            {!years.includes(selectedYear) && <option value={selectedYear} style={{ color: 'black' }}>{selectedYear}</option>}
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={18} />
                        <input 
                            className="glass-input" 
                            placeholder="Search donors..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '45px', width: '100%' }} 
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => memberStatements.forEach(s => printStatement(s))}>
                        <Printer size={18} style={{ marginRight: '8px' }} /> Print All Statements
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <tr>
                            <th style={{ padding: '1.5rem', textAlign: 'left' }}>Donor Name</th>
                            <th style={{ padding: '1.5rem', textAlign: 'left' }}>Total Contributions ({selectedYear})</th>
                            <th style={{ padding: '1.5rem', textAlign: 'left' }}>Transactions</th>
                            <th style={{ padding: '1.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberStatements.map((stmt, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1.5rem', fontWeight: 800 }}>{stmt.member.name}</td>
                                <td style={{ padding: '1.5rem', color: '#10b981', fontWeight: 600 }}>${stmt.total.toFixed(2)}</td>
                                <td style={{ padding: '1.5rem', opacity: 0.7 }}>{stmt.transactions.length} records</td>
                                <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                                    <button className="btn glass" onClick={() => printStatement(stmt)}>
                                        <Download size={16} style={{ marginRight: '8px' }} /> PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {memberStatements.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No donation records found for {selectedYear}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaxStatements;
