import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    X,
    Save,
    RotateCcw,
    Clock,
    ScanLine,
    Camera,
    CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Tesseract from 'tesseract.js';
import { useLanguage } from '../contexts/LanguageContext';

interface Expense {
    id: string;
    date: string;
    description: string;
    category: string;
    department: string;
    amount: number;
    paymentMethod: string;
    receiptImage?: string | null;
}

const DEFAULT_CATEGORIES = [
    'Supplies',
    'Utilities',
    'Maintenance',
    'Mission & Outreach',
    'Events',
    'Payroll',
    'Hospitality',
    'Printing & Media',
    'Evangelism',
    'Travel',
    'Insurance',
    'Building Fund',
    'Worship Supplies',
    'Youth Ministry',
    'Education',
    'Other'
];

interface ExpensesProps {
    setActiveTab: (tab: string) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ setActiveTab: _setActiveTab }) => {
    const { t, language } = useLanguage();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [scanStep, setScanStep] = useState<'camera' | 'processing' | 'done'>('camera');
    const [scannedFile, setScannedFile] = useState<string | null>(null);
    const [scannedAmount, setScannedAmount] = useState('');
    const [scannedDesc, setScannedDesc] = useState('');
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);

    const [categories, setCategories] = useState<string[]>(() => {
        const saved = localStorage.getItem('sanctuary_expense_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    useEffect(() => {
        localStorage.setItem('sanctuary_expense_categories', JSON.stringify(categories));
    }, [categories]);

    // Filter states
    const [categoryFilter, setCategoryFilter] = useState(t('allCategories'));
    const [deptFilter, setDeptFilter] = useState(t('allDepartments'));
    const [startDate, setStartDate] = useState('2026-03-01');
    const [endDate, setEndDate] = useState('2026-03-07');

    // Form states
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [dept, setDept] = useState('General');
    const [cat, setCat] = useState(categories[0] || 'Supplies'); // Initialize with first available category
    const [method, setMethod] = useState('CASH');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);

    const [availableDepts, setAvailableDepts] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Ledger (type: out) from Supabase
                const { data: ledger } = await supabase
                    .from('ledger')
                    .select('*')
                    .eq('type', 'out');

                if (ledger) {
                    const expenseList = ledger.map((tx: any) => ({
                        id: tx.id,
                        date: tx.date,
                        description: tx.desc,
                        category: tx.cat?.replace(' Exp', '').toUpperCase(),
                        department: tx.dept,
                        amount: Math.abs(tx.amount),
                        paymentMethod: tx.method || 'CASH',
                        receiptImage: tx.receipt_url || tx.receiptImage
                    }));
                    setExpenses(expenseList);
                }

                // Fetch Departments
                const { data: depts } = await supabase.from('departments').select('*');
                if (depts) setAvailableDepts(depts);
            } catch (err) {
                console.error('Error fetching expenses from Supabase:', err);

                // Fallback
                const savedLedger = localStorage.getItem('sanctuary_ledger');
                if (savedLedger) {
                    const ledger = JSON.parse(savedLedger);
                    const expenseList = ledger
                        .filter((tx: any) => tx.type === 'out')
                        .map((tx: any, idx: number) => ({
                            id: tx.id || idx.toString(),
                            date: tx.date,
                            description: tx.desc,
                            category: tx.cat.replace(' Exp', '').toUpperCase(),
                            department: tx.dept,
                            amount: Math.abs(tx.amount),
                            paymentMethod: tx.method || 'CASH',
                            receiptImage: tx.receiptImage
                        }));
                    setExpenses(expenseList);
                }
            }
        };

        fetchData();
    }, [showAddModal]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(data.path);

            setReceiptImage(publicUrl);
            setScannedFile(publicUrl);
        } catch (err) {
            console.error('Error uploading receipt:', err);
            alert('Error uploading receipt. Ensure "receipts" bucket exists in Supabase.');
        } finally {
            setIsUploading(false);
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (isNaN(amt)) return;

        const expenseData = {
            id: editingExpenseId || `exp_${Date.now()}`,
            date: new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
            desc: desc, // Using ledger schema 'desc'
            cat: `${cat} Exp`,
            dept: dept,
            fund: 'General Fund (Tithes)',
            fundId: 'gf',
            amount: -amt,
            type: 'out',
            method: method.toUpperCase(),
            receipt_url: receiptImage,
            created_at: new Date().toISOString()
        };

        try {
            if (editingExpenseId) {
                const { error } = await supabase
                    .from('ledger')
                    .update(expenseData)
                    .eq('id', editingExpenseId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('ledger')
                    .insert([expenseData]);
                if (error) throw error;
            }

            // Refresh list
            setShowAddModal(false);
            resetForm();
        } catch (err) {
            console.error('Error saving expense to Supabase:', err);
            // Fallback for UI
            setExpenses([{
                id: expenseData.id,
                date: expenseData.date,
                description: expenseData.desc,
                category: cat.toUpperCase(),
                department: dept,
                amount: amt,
                paymentMethod: expenseData.method,
                receiptImage: expenseData.receipt_url
            }, ...expenses]);
            setShowAddModal(false);
            resetForm();
        }
    };

    const resetForm = () => {
        setEditingExpenseId(null);
        setDesc('');
        setAmount('');
        setDept('General');
        setCat(categories[0] || 'Supplies');
        setMethod('CASH');
        setDate(new Date().toISOString().split('T')[0]);
        setReceiptImage(null);
        setIsAddingCategory(false);
        setNewCatName('');
    };

    const handleEdit = (exp: Expense) => {
        setEditingExpenseId(exp.id);
        setDesc(exp.description);
        setAmount(exp.amount.toString());
        setDept(exp.department);
        setCat(exp.category);
        setMethod(exp.paymentMethod);
        const d = new Date(exp.date);
        if (!isNaN(d.getTime())) {
            setDate(d.toISOString().split('T')[0]);
        }
        setReceiptImage(exp.receiptImage || null);
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('ledger').delete().eq('id', id);
            if (error) throw error;
            setExpenses(expenses.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting expense:', err);
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    const toggleScan = async () => {
        if (!isScanning) {
            setIsScanning(true);
            setScanStep('camera');
            setScannedFile(null);
            
            // Try to start live camera for a real "scan" feel
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' },
                    audio: false 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.warn('Live camera not available, falling back to system capture:', err);
                // If live camera fails (e.g. no permissions), we'll just show the manual trigger
            }
        } else {
            stopCamera();
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setScannedFile(dataUrl);
            setScanStep('processing');
            stopCamera();
            
            // ── OCR Neural Extraction ───────────────────────────
            try {
                const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
                
                // Intelligent Parsing Logic
                const lines = text.split('\n');
                let foundAmount = '';
                let foundMerchant = '';
                
                // Helper to find amounts like $12.34 or 12,34
                const amtRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/;
                
                lines.forEach(line => {
                    const match = line.match(amtRegex);
                    if (match && !foundAmount) foundAmount = match[0].replace(',', '');
                    if (line.length > 5 && !foundMerchant && !line.includes('Total') && !line.match(/\d/)) {
                        foundMerchant = line.trim();
                    }
                });

                setScannedAmount(foundAmount || '0.00');
                setScannedDesc(foundMerchant || 'Extracted Receipt');
                setScanStep('done');
            } catch (err) {
                console.error('OCR Error:', err);
                setScannedAmount('0.00');
                setScannedDesc('Extraction Failed');
                setScanStep('done');
            }
        }
    };

    const handleSaveScanned = async () => {
        const amt = parseFloat(scannedAmount);
        if (isNaN(amt)) return;

        const expenseData = {
            id: `exp_${Date.now()}`,
            date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
            desc: scannedDesc,
            cat: 'Supplies Exp',
            dept: 'General',
            fund: 'General Fund (Tithes)',
            fundId: 'gf',
            amount: -amt,
            type: 'out',
            method: 'CASH',
            receipt_url: scannedFile,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('ledger').insert([expenseData]);
            if (error) throw error;
            toggleScan();
        } catch (err) {
            console.error('Error saving scanned expense:', err);
            toggleScan();
        }
    };

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
                        style={{ width: '100%', maxWidth: '480px', borderRadius: '28px', padding: '3rem' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Expense History</h2>
                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[
                                { date: 'Mar 07, 2026', desc: 'Maintenance Supplies (Home Depot)', amount: '-$142.50', status: 'Removed' },
                                { date: 'Mar 05, 2026', desc: 'Sabbath School Printing', amount: '-$89.00', status: 'Updated' },
                                { date: 'Feb 28, 2026', desc: 'Utility Bill (Sanctuary Hall)', amount: '-$450.00', status: 'Committed' },
                            ].map((h, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <div>
                                        <p style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{h.desc}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.date}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 800, color: h.status === 'Removed' ? 'var(--danger)' : 'white' }}>{h.amount}</p>
                                        <p style={{ fontSize: '0.65rem', color: h.status === 'Removed' ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>{h.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2.5rem' }} onClick={() => setShowHistoryModal(false)}>Close Activity Log</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                        {t('missionMatrix').split(' ')[0]} <span className="gradient-text">{t('expenses')}</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{language === 'es' ? 'Transparencia total de los flujos operativos de la iglesia' : 'Full transparency of local church operational outflows'}</p>
                </div>
                <button className="btn btn-ghost" style={{ gap: '8px', padding: '0.75rem 1.5rem', borderRadius: '12px' }} onClick={() => setShowHistoryModal(true)}>
                    <Clock size={16} /> {language === 'es' ? 'Historial' : 'History'}
                </button>
            </header>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{t('expenseRegistry')}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{t('auditableRecordDesc')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: 'none', justifyContent: 'flex-start' }}>
                        <button className="btn btn-ghost" onClick={toggleScan} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                            <Camera size={16} /> {t('scan')}
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                            <Plus size={16} /> {t('new')}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-light)', fontWeight: 600 }}>2 active</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <button className="btn glass" style={{ fontSize: '0.75rem', gap: '6px' }}><X size={14} /> {t('clear')}</button>
                        <button className="btn glass" style={{ fontSize: '0.75rem', gap: '6px' }}><Save size={14} /> {t('savePreset')}</button>
                    </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('category')}</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value={t('allCategories')}>{language === 'es' ? 'Todo' : 'All'}</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('department')}</label>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option>{language === 'es' ? 'Todos' : 'All'}</option>
                            {availableDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'es' ? 'Desde' : 'From'}</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'es' ? 'Hasta' : 'To'}</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%)', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <div>
                        <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{t('outflowTotal')}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>March 2026</p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>March 2026</h4>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('monthlyTotal')}: <strong style={{ color: '#0f172a' }}>${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                </div>

                <div style={{ overflowX: 'auto', margin: '0 -1rem', padding: '0 1rem' }}>
                    <table style={{ minWidth: '600px' }}>
                        <thead>
                            <tr>
                                <th>{t('date')}</th>
                                <th>{t('description')}</th>
                                <th>{t('category')}</th>
                                <th className="mobile-hide">{language === 'es' ? 'Depto' : 'Dept'}</th>
                                <th>{t('amount')}</th>
                                <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((exp) => (
                                <tr key={exp.id}>
                                    <td style={{ fontSize: '0.8rem' }}>{exp.date}</td>
                                    <td style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{exp.description}</td>
                                    <td>
                                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-light)', fontWeight: 800, textTransform: 'uppercase' }}>{exp.category}</span>
                                    </td>
                                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>{exp.department}</td>
                                    <td style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)' }}>-${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => handleEdit(exp)}><Edit2 size={14} /></button>
                                            <button style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer' }} onClick={() => handleDelete(exp.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showAddModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => { setShowAddModal(false); resetForm(); }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-card" style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '3rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'white' }}>{editingExpenseId ? t('updateExpense') : t('newExpense')}</h2>
                            <form onSubmit={handleAddExpense}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('receiptPdf')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <button 
                                            type="button"
                                            disabled={isUploading}
                                            onClick={() => cameraInputRef.current?.click()}
                                            style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)', borderRadius: '12px', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isUploading ? 0.5 : 1 }}
                                        >
                                            <Camera size={16} /> {t('useCamera')}
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={isUploading}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', borderRadius: '12px', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isUploading ? 0.5 : 1 }}
                                        >
                                            <ScanLine size={16} /> {t('uploadDoc')}
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={cameraInputRef}
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        capture="environment"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        accept="image/*,application/pdf"
                                    />
                                    
                                    {isUploading && (
                                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                                <RotateCcw size={16} />
                                            </motion.div>
                                            {t('uploadingSecureDoc')}
                                        </div>
                                    )}
                                    
                                    {receiptImage && !isUploading && (
                                        <div style={{ marginTop: '1rem', position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '100px', border: '1px solid var(--border)' }}>
                                            {receiptImage.includes('.pdf') ? (
                                                <div style={{ height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                                                    <CheckCircle2 size={16} color="var(--success)" /> {t('pdfUploaded')}
                                                </div>
                                            ) : (
                                                <img src={receiptImage} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={() => setReceiptImage(null)}
                                                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
 
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('description')}</label>
                                    <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Office Supplies" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem' }} />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('amount')}</label>
                                    <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem' }} />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('department')}</label>
                                    <select value={dept} onChange={e => setDept(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem', appearance: 'none', background: 'white' }}>
                                        {availableDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('category')}</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory(!isAddingCategory)}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            {isAddingCategory ? t('cancel') : `+ ${t('new')}`}
                                        </button>
                                    </div>

                                    {isAddingCategory ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={newCatName}
                                                onChange={e => setNewCatName(e.target.value)}
                                                placeholder="Category name"
                                                style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newCatName && !categories.includes(newCatName)) {
                                                        setCategories([...categories, newCatName]);
                                                        setCat(newCatName);
                                                        setNewCatName('');
                                                        setIsAddingCategory(false);
                                                    }
                                                }}
                                                className="btn btn-primary"
                                                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                                            >
                                                {t('new')}
                                            </button>
                                        </div>
                                    ) : (
                                        <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem', appearance: 'none', background: 'white' }}>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('date')}</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('paymentMethod')}</label>
                                        <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '0.95rem', appearance: 'none', background: 'white' }}>
                                            <option value="CASH">CASH</option>
                                            <option value="CHECK">CHECK</option>
                                            <option value="ONLINE">ONLINE</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowAddModal(false); resetForm(); }}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingExpenseId ? t('recordUpdate') : t('commitToLedger')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                background: '#1e293b',
                                borderRadius: '32px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '2rem',
                                textAlign: 'center',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={toggleScan}
                                style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>

                            {scanStep === 'camera' && (
                                <>
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'black', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <video 
                                            ref={videoRef} 
                                            autoPlay 
                                            playsInline 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{ position: 'absolute', inset: '20px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px' }} />
                                        
                                        <button 
                                            onClick={capturePhoto}
                                            style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', width: '50px', height: '50px', borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                        />
                                    </div>

                                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <button 
                                            className="btn btn-ghost"
                                            onClick={() => cameraInputRef.current?.click()}
                                        >
                                            <Camera size={16} /> {t('useCameraApp')}
                                        </button>
                                        <button 
                                            className="btn btn-ghost"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <ScanLine size={16} /> {t('browseFiles')}
                                        </button>
                                    </div>
                                </>
                            )}

                            {scanStep === 'processing' && (
                                <div style={{ padding: '3rem 0' }}>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}
                                    >
                                        <ScanLine size={64} color="var(--primary-light)" />
                                    </motion.div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>{t('processing')}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>{t('extractingLineItems')}</p>
                                </div>
                            )}

                            {scanStep === 'done' && (
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                        <CheckCircle2 size={48} color="#10b981" />
                                    </div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white', textAlign: 'center' }}>{t('receiptExtracted')}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{t('confirmDetailsDesc')}</p>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>Detected Description</label>
                                        <input type="text" value={scannedDesc} onChange={e => setScannedDesc(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: 'white' }} />
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>Total Amount</label>
                                        <input type="text" value={scannedAmount} onChange={e => setScannedAmount(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: 'white', fontSize: '1.25rem', fontWeight: 700 }} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn" style={{ flex: 1, color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} onClick={toggleScan}>
                                            Discard
                                        </button>
                                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveScanned}>
                                            Save to Ledger
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <HistoryModal />
        </div >
    );
};

export default Expenses;
