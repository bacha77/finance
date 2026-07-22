import React, { useState, useMemo } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { Calendar, Printer } from 'lucide-react';

interface GaapReportsProps {
    churchId: string;
    churchName: string;
}

const GaapReports: React.FC<GaapReportsProps> = ({ churchId, churchName }) => {
    const { ledger, funds, isLoading } = useFinanceData(churchId);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportType, setReportType] = useState<'financial_position' | 'activities'>('financial_position');

    const years = useMemo(() => {
        const uniqueYears = new Set(ledger.map(tx => new Date(tx.date || tx.created_at || '').getFullYear()));
        return Array.from(uniqueYears).sort((a, b) => b - a);
    }, [ledger]);

    const { assets, netAssets, totalAssets, totalLiabilitiesNetAssets } = useMemo(() => {
        // Simple Balance Sheet (Statement of Financial Position)
        // Assets are basically the funds we hold
        const totalFunds = funds.reduce((sum, f) => sum + (f.balance || 0), 0);
        
        return {
            assets: [
                { name: 'Cash and Cash Equivalents', amount: totalFunds },
            ],
            totalAssets: totalFunds,
            liabilities: [],
            totalLiabilities: 0,
            netAssets: [
                { name: 'Without Donor Restrictions', amount: funds.filter(f => f.name.toLowerCase().includes('general') || f.name.toLowerCase().includes('operating')).reduce((sum, f) => sum + (f.balance || 0), 0) },
                { name: 'With Donor Restrictions', amount: funds.filter(f => !f.name.toLowerCase().includes('general') && !f.name.toLowerCase().includes('operating')).reduce((sum, f) => sum + (f.balance || 0), 0) },
            ],
            totalLiabilitiesNetAssets: totalFunds
        };
    }, [funds]);

    const { incomeUnrestricted, incomeRestricted, expenseUnrestricted, expenseRestricted } = useMemo(() => {
        // Statement of Activities
        const yearLedger = ledger.filter(tx => {
            const d = new Date(tx.date || tx.created_at || '');
            return d.getFullYear() === selectedYear;
        });

        const isRestricted = (tx: any) => {
            return tx.fund && !tx.fund.toLowerCase().includes('general') && !tx.fund.toLowerCase().includes('operating');
        };

        const income = yearLedger.filter(tx => tx.type === 'in');
        const expenses = yearLedger.filter(tx => tx.type === 'out');

        return {
            incomeUnrestricted: income.filter(tx => !isRestricted(tx)).reduce((sum, tx) => sum + Number(tx.amount), 0),
            incomeRestricted: income.filter(tx => isRestricted(tx)).reduce((sum, tx) => sum + Number(tx.amount), 0),
            expenseUnrestricted: expenses.filter(tx => !isRestricted(tx)).reduce((sum, tx) => sum + Number(tx.amount), 0),
            expenseRestricted: expenses.filter(tx => isRestricted(tx)).reduce((sum, tx) => sum + Number(tx.amount), 0),
        };
    }, [ledger, selectedYear]);

    const printReport = () => {
        window.print();
    };

    if (isLoading) return <div>Loading reports...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <style>{`
                @media print {
                    html, body { background: white !important; margin: 0 !important; color: black !important; }
                    #root { display: none !important; }
                    .print-gaap {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        z-index: 99999999 !important;
                        padding: 2rem !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                @media screen {
                    .print-gaap { display: none !important; }
                }
            `}</style>
            <div className="print-gaap">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{churchName}</h1>
                    <h2 style={{ fontSize: '1.2rem' }}>
                        {reportType === 'financial_position' ? 'Statement of Financial Position' : 'Statement of Activities'}
                    </h2>
                    <p>
                        {reportType === 'financial_position' ? `As of December 31, ${selectedYear}` : `For the Year Ended December 31, ${selectedYear}`}
                    </p>
                </div>

                {reportType === 'financial_position' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr><td colSpan={2} style={{ fontWeight: 'bold', padding: '0.5rem 0' }}>ASSETS</td></tr>
                            {assets.map((a, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '0.5rem 0', paddingLeft: '2rem' }}>{a.name}</td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${a.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid black', borderBottom: '4px double black' }}>
                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Assets</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${totalAssets.toFixed(2)}</td>
                            </tr>
                            
                            <tr><td colSpan={2} style={{ height: '2rem' }}></td></tr>

                            <tr><td colSpan={2} style={{ fontWeight: 'bold', padding: '0.5rem 0' }}>LIABILITIES AND NET ASSETS</td></tr>
                            <tr><td colSpan={2} style={{ padding: '0.5rem 0', fontStyle: 'italic' }}>Net Assets</td></tr>
                            {netAssets.map((na, i) => (
                                <tr key={i}>
                                    <td style={{ padding: '0.5rem 0', paddingLeft: '2rem' }}>{na.name}</td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${na.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid black', borderBottom: '4px double black' }}>
                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Liabilities and Net Assets</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${totalLiabilitiesNetAssets.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {reportType === 'activities' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid black' }}>
                                <th></th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Without Donor Restrictions</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>With Donor Restrictions</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colSpan={4} style={{ fontWeight: 'bold', padding: '1rem 0 0.5rem 0' }}>REVENUES AND SUPPORT</td></tr>
                            <tr>
                                <td style={{ padding: '0.5rem 0', paddingLeft: '2rem' }}>Contributions and Offerings</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${incomeUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${incomeRestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${(incomeUnrestricted + incomeRestricted).toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid black' }}>
                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Revenues and Support</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${incomeUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${incomeRestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(incomeUnrestricted + incomeRestricted).toFixed(2)}</td>
                            </tr>

                            <tr><td colSpan={4} style={{ fontWeight: 'bold', padding: '1rem 0 0.5rem 0' }}>EXPENSES</td></tr>
                            <tr>
                                <td style={{ padding: '0.5rem 0', paddingLeft: '2rem' }}>Program Services / Operations</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${expenseUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${expenseRestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>${(expenseUnrestricted + expenseRestricted).toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid black' }}>
                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Expenses</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${expenseUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${expenseRestricted.toFixed(2)}</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(expenseUnrestricted + expenseRestricted).toFixed(2)}</td>
                            </tr>

                            <tr style={{ borderTop: '2px solid black', borderBottom: '4px double black' }}>
                                <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Change in Net Assets</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(incomeUnrestricted - expenseUnrestricted).toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(incomeRestricted - expenseRestricted).toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${((incomeUnrestricted + incomeRestricted) - (expenseUnrestricted + expenseRestricted)).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>GAAP-Compliant Reporting</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Formal accounting statements for board review.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                        <select 
                            value={reportType} 
                            onChange={e => setReportType(e.target.value as any)}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                        >
                            <option value="financial_position" style={{ color: 'black' }}>Statement of Financial Position</option>
                            <option value="activities" style={{ color: 'black' }}>Statement of Activities</option>
                        </select>
                    </div>
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
                    <button className="btn btn-primary" onClick={printReport}>
                        <Printer size={18} style={{ marginRight: '8px' }} /> Print Report
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
                 {reportType === 'financial_position' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <tbody>
                            <tr><td colSpan={2} style={{ fontWeight: 'bold', padding: '0.5rem 0', color: 'var(--text-muted)' }}>ASSETS</td></tr>
                            {assets.map((a, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem 0', paddingLeft: '2rem' }}>{a.name}</td>
                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>${a.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                                <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Total Assets</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>${totalAssets.toFixed(2)}</td>
                            </tr>
                            
                            <tr><td colSpan={2} style={{ height: '2rem' }}></td></tr>

                            <tr><td colSpan={2} style={{ fontWeight: 'bold', padding: '0.5rem 0', color: 'var(--text-muted)' }}>LIABILITIES AND NET ASSETS</td></tr>
                            <tr><td colSpan={2} style={{ padding: '0.5rem 0', fontStyle: 'italic', opacity: 0.8 }}>Net Assets</td></tr>
                            {netAssets.map((na, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem 0', paddingLeft: '2rem' }}>{na.name}</td>
                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>${na.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                                <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Total Liabilities and Net Assets</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>${totalLiabilitiesNetAssets.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {reportType === 'activities' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                <th></th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Without Donor Restrictions</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>With Donor Restrictions</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colSpan={4} style={{ fontWeight: 'bold', padding: '1.5rem 0 0.5rem 0', color: 'var(--text-muted)' }}>REVENUES AND SUPPORT</td></tr>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem 0', paddingLeft: '2rem' }}>Contributions and Offerings</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>${incomeUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>${incomeRestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>${(incomeUnrestricted + incomeRestricted).toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Total Revenues and Support</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${incomeUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${incomeRestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>${(incomeUnrestricted + incomeRestricted).toFixed(2)}</td>
                            </tr>

                            <tr><td colSpan={4} style={{ fontWeight: 'bold', padding: '1.5rem 0 0.5rem 0', color: 'var(--text-muted)' }}>EXPENSES</td></tr>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem 0', paddingLeft: '2rem' }}>Program Services / Operations</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>${expenseUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>${expenseRestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>${(expenseUnrestricted + expenseRestricted).toFixed(2)}</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Total Expenses</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${expenseUnrestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>${expenseRestricted.toFixed(2)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>${(expenseUnrestricted + expenseRestricted).toFixed(2)}</td>
                            </tr>

                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                <td style={{ padding: '1.5rem 0', fontWeight: 'bold' }}>Change in Net Assets</td>
                                <td style={{ padding: '1.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(incomeUnrestricted - expenseUnrestricted).toFixed(2)}</td>
                                <td style={{ padding: '1.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>${(incomeRestricted - expenseRestricted).toFixed(2)}</td>
                                <td style={{ padding: '1.5rem 0', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6' }}>${((incomeUnrestricted + incomeRestricted) - (expenseUnrestricted + expenseRestricted)).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default GaapReports;
