import React, { useState, useEffect } from 'react';
import {
    PieChart,
    Target,
    Calendar,
    DollarSign,
    Percent,
    Plus,
    Trash2,
    Save,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface BudgetAllocation {
    deptId: string;
    percentage: number;
    amount: number;
}

interface BudgetYear {
    year: number;
    totalBudget: number;
    allocations: BudgetAllocation[];
}

interface BudgetProps {
    setActiveTab: (tab: string) => void;
}

const Budget: React.FC<BudgetProps> = ({ setActiveTab }) => {
    const [budgets, setBudgets] = useState<BudgetYear[]>([]);
    const [activeYear, setActiveYear] = useState(2026);
    const [departments, setDepartments] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Budgets
                const { data: budgetData } = await supabase
                    .from('budgets')
                    .select('*');

                if (budgetData && budgetData.length > 0) {
                    setBudgets(budgetData.map(b => ({
                        year: b.year,
                        totalBudget: b.total_budget,
                        allocations: b.allocations
                    })));
                } else {
                    // Seed initial data if empty
                    setBudgets([{
                        year: 2026,
                        totalBudget: 500000,
                        allocations: [
                            { deptId: '1', percentage: 25, amount: 125000 },
                            { deptId: '2', percentage: 30, amount: 150000 },
                            { deptId: '3', percentage: 10, amount: 50000 },
                            { deptId: '4', percentage: 10, amount: 50000 },
                            { deptId: '5', percentage: 25, amount: 125000 },
                        ]
                    }]);
                }

                // Fetch Departments
                const { data: deptData } = await supabase.from('departments').select('*');
                if (deptData) setDepartments(deptData);

                // Fetch Ledger
                const { data: ledgerData } = await supabase.from('ledger').select('*');
                if (ledgerData) setLedger(ledgerData);

            } catch (err) {
                console.error('Error fetching budget data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const syncBudgets = async () => {
            if (budgets.length === 0) return;
            // In a real app, we'd only save when user clicks "Save" or debounced.
            // For now, syncing to local storage as backup and preparing for Supabase upsert.
            localStorage.setItem('sanctuary_budgets', JSON.stringify(budgets));
        };
        syncBudgets();
    }, [budgets]);

    const calculateSpent = (deptName: string) => {
        return ledger
            .filter(tx => tx.dept === deptName && tx.type === 'out')
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    };

    const currentBudget = budgets.find(b => b.year === activeYear) || budgets[0];

    const updateCurrentBudget = (updates: Partial<BudgetYear>) => {
        setBudgets(budgets.map(b => b.year === activeYear ? { ...b, ...updates } : b));
    };

    const handleTotalBudgetChange = (value: string) => {
        const total = parseFloat(value) || 0;
        const newAllocations = currentBudget.allocations.map((a: BudgetAllocation) => ({
            ...a,
            amount: (total * a.percentage) / 100
        }));
        updateCurrentBudget({ totalBudget: total, allocations: newAllocations });
    };

    const [selectedNewDept, setSelectedNewDept] = useState('');

    const handleAddAllocation = () => {
        if (!selectedNewDept) return;
        if (currentBudget.allocations.find(a => a.deptId === selectedNewDept)) return;

        const newAllocation: BudgetAllocation = {
            deptId: selectedNewDept,
            percentage: 0,
            amount: 0
        };

        updateCurrentBudget({
            allocations: [...currentBudget.allocations, newAllocation]
        });
        setSelectedNewDept('');
    };

    const handleRemoveAllocation = (deptId: string) => {
        updateCurrentBudget({
            allocations: currentBudget.allocations.filter(a => a.deptId !== deptId)
        });
    };

    const handlePercentageChange = (deptId: string, value: string) => {
        const percent = parseFloat(value) || 0;
        const newAllocations = currentBudget.allocations.map((a: BudgetAllocation) => {
            if (a.deptId === deptId) {
                return {
                    ...a,
                    percentage: percent,
                    amount: (currentBudget.totalBudget * percent) / 100
                };
            }
            return a;
        });
        updateCurrentBudget({ allocations: newAllocations });
    };

    const handleSaveBudget = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('budgets')
                .upsert({
                    year: activeYear,
                    total_budget: currentBudget.totalBudget,
                    allocations: currentBudget.allocations,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'year' });

            if (error) throw error;
            alert(`Budget for fiscal year ${activeYear} saved successfully!`);
        } catch (err) {
            console.error('Error saving budget:', err);
            alert('Failed to save budget to cloud. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitializeNewYear = () => {
        const nextYear = Math.max(...budgets.map(b => b.year)) + 1;
        const newBudget: BudgetYear = {
            ...currentBudget,
            year: nextYear,
        };
        setBudgets([...budgets, newBudget]);
        setActiveYear(nextYear);
    };

    const totalAllocatedPercent = currentBudget.allocations.reduce((sum: number, a: BudgetAllocation) => sum + a.percentage, 0);
    const totalAllocatedAmount = currentBudget.allocations.reduce((sum: number, a: BudgetAllocation) => sum + a.amount, 0);

    const HistoryModal = () => (
        <AnimatePresence>
            {showHistoryModal && (
                <div
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                    onClick={() => setShowHistoryModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        className="glass-card"
                        style={{ width: '100%', maxWidth: '520px', borderRadius: '28px', padding: '3rem' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Strategic Audit Log</h2>
                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { date: 'Mar 08, 2026', type: 'ALLOCATION_ADJUSTMENT', details: 'Youth Ministry budget increased by 15%', user: 'Admin' },
                                { date: 'Mar 05, 2026', type: 'YEARLY_PLAN_INIT', details: 'Initialized budget framework for FY 2027', user: 'Finance Committee' },
                                { date: 'Feb 12, 2026', type: 'CAPITAL_RESERVE', details: 'Allocated $50k to Building Fund reserve', user: 'Admin' },
                            ].map((h, i) => (
                                <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <p style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h.type}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.date}</p>
                                    </div>
                                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', marginBottom: '8px' }}>{h.details}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actioned by: <span style={{ color: 'white' }}>{h.user}</span></p>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2.5rem' }} onClick={() => setShowHistoryModal(false)}>Close Audit Log</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
                            Strategic <span className="gradient-text">Budgeting</span>
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Fiscal management and multi-year resource planning</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>FISCAL YEAR</span>
                            <select
                                value={activeYear}
                                onChange={(e) => setActiveYear(parseInt(e.target.value))}
                                style={{ background: 'none', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                            >
                                {budgets.sort((a, b) => b.year - a.year).map(b => (
                                    <option key={b.year} value={b.year} style={{ background: '#1e293b' }}>{b.year}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn glass"
                            onClick={handleInitializeNewYear}
                            style={{ gap: '8px', padding: '0.75rem 1.5rem' }}
                        >
                            <Calendar size={18} /> Plan Next Year
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveBudget}
                            disabled={isLoading}
                            style={{ gap: '8px', padding: '0.75rem 1.5rem' }}
                        >
                            <Save size={18} /> {isLoading ? 'Saving...' : 'Save to Cloud'}
                        </button>
                    </div>
                </div>

                {/* Budget Alerts Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                    {currentBudget.allocations.map(alloc => {
                        const dept = departments.find(d => d.id === alloc.deptId);
                        const spent = calculateSpent(dept?.name || '');
                        const isOver = spent > alloc.amount;
                        if (!isOver) return null;

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={alloc.deptId}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}
                            >
                                <AlertTriangle size={20} color="var(--danger)" />
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Budget Alert: {dept?.name}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Expenditure (${spent.toLocaleString()}) has exceeded the allocated budget of ${alloc.amount.toLocaleString()}.</p>
                                </div>
                                <button
                                    className="btn"
                                    style={{ background: 'var(--danger)', color: 'white', fontSize: '0.75rem', padding: '6px 12px' }}
                                    onClick={() => setActiveTab('accounting')}
                                >
                                    Review Ledger
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Annual Budget Limit ({activeYear})</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Define the total ceiling for this fiscal period</p>
                        </div>
                        <div style={{ position: 'relative', width: '280px' }}>
                            <DollarSign size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-light)' }} />
                            <input
                                type="number"
                                value={currentBudget.totalBudget}
                                onChange={(e) => handleTotalBudgetChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid var(--border)',
                                    color: 'white',
                                    fontSize: '1.5rem',
                                    fontWeight: 800,
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Allocation Weight (%)</th>
                                    <th style={{ textAlign: 'right' }}>Amt ({activeYear})</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentBudget.allocations.map((alloc: BudgetAllocation) => {
                                    const dept = departments.find((d: any) => d.id === alloc.deptId);
                                    return (
                                        <tr key={alloc.deptId}>
                                            <td style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>
                                                {dept ? dept.name : `Dept ${alloc.deptId}`}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ position: 'relative', width: '100px' }}>
                                                        <Percent size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                        <input
                                                            type="number"
                                                            value={alloc.percentage}
                                                            onChange={(e) => handlePercentageChange(alloc.deptId, e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 24px 8px 12px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid var(--border)',
                                                                color: 'white',
                                                                fontWeight: 700,
                                                                textAlign: 'right'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${alloc.percentage}%` }}
                                                            style={{ height: '100%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-light)' }}>
                                                ${alloc.amount.toLocaleString()}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const spent = calculateSpent(dept?.name || '');
                                                    const isOver = spent > alloc.amount;
                                                    return (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            backgroundColor: isOver ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                            color: isOver ? 'var(--danger)' : 'var(--success)',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            width: 'fit-content'
                                                        }}>
                                                            {isOver ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                                            {isOver ? 'Over Budget' : 'Verified'}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleRemoveAllocation(alloc.deptId)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', opacity: 0.6, cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>ADD NEW ALLOCATION LINE</label>
                            <select
                                value={selectedNewDept}
                                onChange={(e) => setSelectedNewDept(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                            >
                                <option value="">Select a department...</option>
                                {departments
                                    .filter(d => !currentBudget.allocations.find(a => a.deptId === d.id))
                                    .map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))
                                }
                            </select>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddAllocation}
                            disabled={!selectedNewDept}
                            style={{ height: '46px', padding: '0 2rem' }}
                        >
                            <Plus size={18} /> Add Line
                        </button>
                    </div>

                    <div style={{
                        marginTop: '3rem',
                        padding: '2rem',
                        borderRadius: '20px',
                        background: totalAllocatedPercent === 100 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                        border: `1px solid ${totalAllocatedPercent === 100 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Allocation Integrity ({activeYear})</p>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: totalAllocatedPercent === 100 ? 'var(--success)' : 'var(--danger)' }}>
                                {totalAllocatedPercent === 100 ? 'System Balanced' : `Imbalance: ${totalAllocatedPercent}% weighted`}
                            </h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Total Pledges/Budget</p>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                                ${totalAllocatedAmount.toLocaleString()}
                            </h4>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                            <PieChart size={20} className="gradient-text" />
                            {activeYear} Fiscal Profile
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {currentBudget.allocations.map((a: BudgetAllocation) => {
                                const dept = departments.find((d: any) => d.id === a.deptId);
                                return (
                                    <div key={a.deptId} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{dept ? dept.name : `Dept ${a.deptId}`}</span>
                                        <span style={{ fontWeight: 800, color: 'white' }}>{a.percentage}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <Target size={24} color="white" />
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white' }}>Historical Context</h3>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '2rem' }}>
                            Viewing budget for {activeYear}. Planning for future years allows the church to anticipate growth and stewardship needs long before the fiscal year begins.
                        </p>
                        <button
                            className="btn"
                            style={{ width: '100%', background: 'white', color: 'var(--primary-dark)', fontWeight: 800 }}
                            onClick={() => setShowHistoryModal(true)}
                        >
                            View Comprehensive Audit
                        </button>
                    </div>
                </div>
            </div>
            <HistoryModal />
        </div>
    );
};

export default Budget;
