import React, { useState, useEffect, useRef } from 'react';
import {
    UserPlus,
    Mail,
    MoreVertical,
    Clock,
    Send,
    FileText,
    Printer,
    Download,
    X,
    ShieldCheck,
    Phone,
    Edit3,
    Trash2,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../contexts/LanguageContext';

interface Member {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    joined: string;
    status: string;
}

const DEFAULT_MEMBERS: Member[] = [
    { name: 'David Wilson', email: 'david.w@example.com', role: 'Member', joined: 'Jan 2024', status: 'Active' },
    { name: 'Emily Chen', email: 'emily.c@example.com', role: 'Volunteer', joined: 'Mar 2024', status: 'Active' },
    { name: 'Michael Brown', email: 'mbrown@example.com', role: 'Member', joined: 'Dec 2023', status: 'Inactive' },
    { name: 'Jessica Taylor', email: 'jtaylor@example.com', role: 'Deacon', joined: 'Jun 2022', status: 'Active' },
];

const MemberPortal: React.FC<{ memberLimit?: number | null }> = ({ memberLimit }) => {
    const { t, language } = useLanguage();
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [editingMember, setEditingMember] = useState<{ member: Member; idx: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const [members, setMembers] = useState<Member[]>(() => {
        const saved = localStorage.getItem('sanctuary_members');
        return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    });

    // Supabase Sync
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const { data } = await supabase
                    .from('members')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (data && data.length > 0) {
                    setMembers(data);
                }
            } catch (err) {
                console.error('Error fetching members from Supabase:', err);
            }
        };

        fetchMembers();
    }, []);

    useEffect(() => {
        localStorage.setItem('sanctuary_members', JSON.stringify(members));
    }, [members]);

    // Invoice / Statement Logic
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth());
    const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
    const [ledger, setLedger] = useState<any[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [treasurerName, setTreasurerName] = useState('Finance Department');

    const handleSendEmail = () => {
        setIsSending(true);
        if (!selectedMember || !churchInfo) {
            setIsSending(false);
            return;
        }

        const donations = getMemberDonations(selectedMember.name);
        const total = donations.reduce((sum, tx) => sum + tx.amount, 0);
        
        const currentMonth = t(`month${invoiceMonth}`);
        const subject = encodeURIComponent(`${churchInfo.name} - ${t('statementOfficialSubject')}: ${currentMonth} ${invoiceYear}`);
        
        let bodyText = `${t('statementDear')} ${selectedMember.name},\n\n`;
        bodyText += `${t('statementGratitude').replace('{churchName}', churchInfo.name)}\n\n`;
        bodyText += `${t('statementAttached').replace('{month}', currentMonth).replace('{year}', invoiceYear.toString())}\n\n`;
        bodyText += `${t('statementTotalContribution')}: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
        bodyText += `--------------------------------------------------\n`;
        
        if (donations.length > 0) {
            bodyText += `${t('statementTransactionRecord')}:\n`;
            donations.forEach(tx => {
                bodyText += `• ${tx.date}: $${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} [${tx.fund}]\n`;
            });
            bodyText += `\n`;
        }

        bodyText += `--------------------------------------------------\n`;
        bodyText += `${t('statementQuestions')}\n\n`;
        bodyText += `${t('statementBlessings')},\n\n`;
        bodyText += `${treasurerName}\n`;
        bodyText += `${t('statementTreasurerLabel')}, ${churchInfo.name}\n`;
        bodyText += `${churchInfo.address || ''}`;

        const mailtoLink = `mailto:${selectedMember.email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
        window.location.href = mailtoLink;

        setTimeout(() => {
            setIsSending(false);
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        }, 1000);
    };

    const [churchInfo, setChurchInfo] = useState<{name: string, city: string, state: string, address?: string} | null>(null);

    useEffect(() => {
        supabase.from('churches').select('name, city, state, address').limit(1).single().then(({data}) => {
            if (data) setChurchInfo(data);
        });
    }, []);

    useEffect(() => {
        const savedLedger = localStorage.getItem('sanctuary_ledger');
        if (savedLedger) setLedger(JSON.parse(savedLedger));
    }, [showInvoiceModal]);

    const months = Array.from({ length: 12 }, (_, i) => t(`month${i}`));

    const getMemberDonations = (memberName: string) => {
        return ledger.filter(tx => {
            const txDate = new Date(tx.date);
            return (
                tx.member === memberName &&
                txDate.getMonth() === invoiceMonth &&
                txDate.getFullYear() === invoiceYear &&
                tx.type === 'in'
            );
        });
    };

    const handleExportPDF = () => {
        if (!selectedMember) return;
        const donations = getMemberDonations(selectedMember.name);
        const total = donations.reduce((sum, tx) => sum + tx.amount, 0);

        const doc = new jsPDF();
        
        // Header / Logo Placeholder
        doc.setFillColor(79, 70, 229);
        doc.rect(14, 15, 10, 10, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text(churchInfo?.name || 'Sanctuary Finance', 28, 24);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const fullAddress = churchInfo?.address || `${churchInfo?.city || ''}, ${churchInfo?.state || ''}`;
        doc.text(fullAddress, 28, 30);
        
        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 40, 196, 40);

        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(t('contributionStatement'), 14, 55);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const currentMonth = t(`month${invoiceMonth}`);
        doc.text(`${t('statementPeriod')}: ${currentMonth} ${invoiceYear}`, 14, 62);
        doc.text(`${t('statementDate')}: ${new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}`, 140, 62);
        
        // Donor Card
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 75, 182, 35, 'F');
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(t('preparedFor'), 20, 85);
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(selectedMember.name, 20, 95);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(selectedMember.email, 20, 102);

        doc.setFontSize(11);
        doc.text(t('totalContributed'), 130, 85);
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text(`$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 130, 95);

        autoTable(doc, {
            startY: 120,
            head: [[t('dateLabel'), t('fundAllocation'), t('description'), t('amount')]],
            body: donations.map(tx => [tx.date, tx.fund, tx.desc || (language === 'es' ? 'Mayordomía' : 'Stewardship'), `$${tx.amount.toLocaleString()}`]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], fontSize: 10, cellPadding: 4 },
            bodyStyles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const currentMonth = t(`month${invoiceMonth}`);
        const message = t('statementOfficialReceipt')
            .replace('{churchName}', churchInfo?.name || (language === 'es' ? 'la iglesia' : 'the church'))
            .replace('{month}', currentMonth)
            .replace('{year}', invoiceYear.toString());
        doc.text(doc.splitTextToSize(message, 170), 14, finalY + 20);

        // Signature Section
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.text('__________________________', 14, finalY + 50);
        doc.text(treasurerName, 14, finalY + 58);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(t('churchTreasurer'), 14, finalY + 63);

        doc.save(`${selectedMember.name.replace(/\s+/g, '_')}_Statement_${currentMonth}_${invoiceYear}.pdf`);
    };

    // Form States
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Member');
    const [newMemberDept, setNewMemberDept] = useState('General');
    
    // Edit form states
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editStatus, setEditStatus] = useState('');

    const [availableDepts, setAvailableDepts] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('sanctuary_departments');
        if (saved) {
            setAvailableDepts(JSON.parse(saved));
        } else {
            setAvailableDepts([
                { id: '1', name: 'Tithes & Finance' },
                { id: '2', name: 'Building & Facilities' },
                { id: '3', name: 'Sabbath School' },
                { id: '4', name: 'Sunday School' },
                { id: '5', name: 'Youth Ministry' },
            ]);
        }
    }, [showAddMemberModal]);

    const [bulkSending, setBulkSending] = useState(false);

    const handleBulkSend = () => {
        setBulkSending(true);
        // Simulate bulk processing
        setTimeout(() => {
            setBulkSending(false);
            alert(`Statements for ${months[new Date().getMonth()]} have been dispatched to all active members.`);
        }, 3000);
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberName || !newMemberEmail) return;

        // Enforce member limit for trial plan
        if (memberLimit !== null && memberLimit !== undefined && members.length >= memberLimit) {
            alert(`Your free trial is limited to ${memberLimit} members. Please upgrade your plan to add more.`);
            return;
        }
        const newMember = {
            name: newMemberName,
            email: newMemberEmail,
            phone: newMemberPhone,
            role: `${newMemberRole} (${newMemberDept})`,
            joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            status: 'Active'
        };

        try {
            const { data, error } = await supabase
                .from('members')
                .insert([newMember])
                .select();

            if (error) throw error;

            if (data) {
                setMembers([data[0], ...members]);
            } else {
                setMembers([newMember, ...members]);
            }
        } catch (err) {
            console.error('Error adding member to Supabase:', err);
            // Fallback to local state if Supabase fails (e.g. table not ready)
            setMembers([newMember, ...members]);
        }

        setShowAddMemberModal(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPhone('');
    };

    const openEditModal = (member: Member, idx: number) => {
        setEditName(member.name);
        setEditEmail(member.email);
        setEditPhone(member.phone || '');
        setEditRole(member.role);
        setEditStatus(member.status);
        setEditingMember({ member, idx });
        setOpenMenuId(null);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;
        const updated: Member = {
            ...editingMember.member,
            name: editName,
            email: editEmail,
            phone: editPhone,
            role: editRole,
            status: editStatus,
        };
        const newList = members.map((m, i) => i === editingMember.idx ? updated : m);
        setMembers(newList);
        // Sync to Supabase if has id
        if (updated.id) {
            try {
                await supabase.from('members').update({
                    name: updated.name,
                    email: updated.email,
                    phone: updated.phone,
                    role: updated.role,
                    status: updated.status,
                }).eq('id', updated.id);
            } catch (err) { console.error('Edit sync failed:', err); }
        }
        setEditingMember(null);
    };

    const handleDeleteMember = async (idx: number) => {
        const member = members[idx];
        if (!window.confirm(`Remove ${member.name} from the member list?`)) return;
        setOpenMenuId(null);
        if (member.id) {
            try {
                await supabase.from('members').delete().eq('id', member.id);
            } catch (err) { console.error('Delete failed:', err); }
        }
        setMembers(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', marginBottom: '4rem' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                        {t('communityCore').split(' ')[0]} <span className="gradient-text">{t('communityCore').split(' ')[1]}</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{t('cultivatingEngagementDesc')}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={handleBulkSend}
                        disabled={bulkSending}
                        style={{ position: 'relative' }}
                    >
                        {bulkSending ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Send size={18} /></motion.div>
                        ) : <Send size={18} />}
                        <span style={{ marginLeft: '8px' }}>{t('bulkStatements')}</span>
                        {bulkSending && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 3 }}
                                style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: 'var(--primary)' }}
                            />
                        )}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowAddMemberModal(true)}
                            disabled={memberLimit !== null && memberLimit !== undefined && members.length >= memberLimit}
                            style={{ opacity: (memberLimit !== null && memberLimit !== undefined && members.length >= memberLimit) ? 0.5 : 1 }}
                        >
                            <UserPlus size={18} /> {t('addMember')}
                        </button>
                        {memberLimit !== null && memberLimit !== undefined && (
                            <span style={{ fontSize: '0.7rem', color: members.length >= memberLimit ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                                {members.length} / {memberLimit} {t('membersUsed')}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {members.map((member: Member, idx: number) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: openMenuId === idx ? 0 : -4, backgroundColor: 'rgba(255,255,255,0.02)' }}
                        animate={{ marginBottom: openMenuId === idx ? '6rem' : '0' }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="glass-card"
                        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'relative', zIndex: openMenuId === idx ? 50 : 1 }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: 'white',
                            boxShadow: '0 8px 16px -4px var(--primary-glow)'
                        }}>
                            {member.name.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h4 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'white' }}>{member.name}</h4>
                                <span style={{
                                    fontSize: '0.65rem',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {member.role}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    <Mail size={14} /> {member.email}
                                </span>
                                {member.phone && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        <Phone size={14} /> {member.phone}
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    <Clock size={14} /> {t('joined')} {member.joined}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: member.status === 'Active' ? 'var(--success)' : 'var(--text-muted)'
                            }}>
                                {member.status}
                            </span>
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '8px 16px', fontSize: '0.75rem', gap: '8px' }}
                                onClick={() => {
                                    setSelectedMember(member);
                                    setShowInvoiceModal(true);
                                }}
                            >
                                <FileText size={16} /> {t('statement')}
                            </button>
                            <div style={{ position: 'relative' }} ref={openMenuId === idx ? menuRef : null}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '8px' }}
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === idx ? null : idx); }}
                                >
                                    <MoreVertical size={20} />
                                </button>
                                <AnimatePresence>
                                    {openMenuId === idx && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.92, y: -6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.92, y: -6 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute', right: 0, top: '110%', zIndex: 9999,
                                                background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                                                padding: '0.4rem', minWidth: '160px',
                                                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {[{
                                                icon: Edit3, label: t('editMember'), color: '#60a5fa',
                                                action: () => openEditModal(member, idx)
                                            }, {
                                                icon: FileText, label: t('viewStatement'), color: '#a78bfa',
                                                action: () => { setSelectedMember(member); setShowInvoiceModal(true); setOpenMenuId(null); }
                                            }, {
                                                icon: Trash2, label: t('removeMember'), color: '#ef4444',
                                                action: () => handleDeleteMember(idx)
                                            }].map(({ icon: Icon, label, color, action }) => (
                                                <button key={label} onClick={action}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        width: '100%', padding: '0.65rem 0.875rem', border: 'none',
                                                        background: 'none', color, fontSize: '0.82rem', fontWeight: 700,
                                                        cursor: 'pointer', borderRadius: '8px', fontFamily: 'inherit',
                                                        textAlign: 'left', transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                                >
                                                    <Icon size={14} /> {label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {showAddMemberModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}
                        onClick={() => setShowAddMemberModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 10, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '440px',
                                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '2.5rem',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('addMember')}</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>{t('manuallyAddMemberDesc')}</p>

                            <form onSubmit={handleAddMember}>
                                 <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('fullName')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('email')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('phoneNumber')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="tel"
                                            value={newMemberPhone}
                                            onChange={(e) => setNewMemberPhone(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('role')}</label>
                                        <select
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                                        >
                                            <option value="Member">Member</option>
                                            <option value="Volunteer">Volunteer</option>
                                            <option value="Deacon">Deacon</option>
                                            <option value="Leader">Leader</option>
                                            <option value="Staff">Staff</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{t('department')}</label>
                                        <select
                                            value={newMemberDept}
                                            onChange={(e) => setNewMemberDept(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                                        >
                                            <option value="General">General</option>
                                            {availableDepts.map(dept => (
                                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn glass" style={{ flex: 1 }} onClick={() => setShowAddMemberModal(false)}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('addMember')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Edit Member Modal ── */}
            <AnimatePresence>
                {editingMember && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}
                        onClick={() => setEditingMember(null)}>
                        <motion.div initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ width: '100%', maxWidth: '460px', background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(15,23,42,0.97) 100%)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '2.25rem', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>{t('editMemberDetails')}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>{t('updateDetailsFor')} {editingMember.member.name}</p>
                                </div>
                                <button onClick={() => setEditingMember(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('fullName')}</label>
                                    <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit' }} />
                                </div>
                                {/* Email */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('email')}</label>
                                    <input type="email" required value={editEmail} onChange={e => setEditEmail(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit' }} />
                                </div>
                                {/* Phone */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Phone size={10} style={{ display: 'inline', marginRight: '4px' }} />{t('phoneNumber')}</label>
                                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit' }} />
                                </div>
                                {/* Role + Status grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('role')}</label>
                                        <input type="text" value={editRole} onChange={e => setEditRole(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('status')}</label>
                                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit', colorScheme: 'dark' }}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setEditingMember(null)}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.875rem' }}>
                                        {t('cancel')}
                                    </button>
                                    <button type="submit"
                                        style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Check size={15} /> {t('saveChanges')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInvoiceModal && selectedMember && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            padding: '2rem'
                        }}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.95 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '850px',
                                background: 'white',
                                borderRadius: '32px',
                                padding: '4rem',
                                color: '#1e293b',
                                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                                overflowY: 'auto',
                                maxHeight: '90vh',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                style={{ position: 'absolute', top: '2rem', right: '2rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={24} />
                            </button>

                            {/* Header Section */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '2rem', marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '2rem' }}>
                                <div style={{ flex: '1 1 min-content' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ShieldCheck color="white" size={24} />
                                        </div>
                                        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.75rem)', fontWeight: 800, color: '#1e293b', margin: 0 }}>{churchInfo?.name || 'Storehouse Finance'}</h2>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, maxWidth: '300px' }}>{churchInfo?.address || `${churchInfo?.city || ''}, ${churchInfo?.state || ''}`}</p>
                                    
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Treasurer Signature Name</label>
                                        <input 
                                            type="text" 
                                            value={treasurerName}
                                            onChange={(e) => setTreasurerName(e.target.value)}
                                            placeholder="Enter Treasurer Name"
                                            style={{ border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.875rem', color: '#1e293b', width: '240px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flex: '1 1 min-content' }}>
                                    <h1 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '1rem', whiteSpace: 'nowrap' }}>Contribution Statement</h1>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <select
                                            value={invoiceMonth}
                                            onChange={(e) => setInvoiceMonth(parseInt(e.target.value))}
                                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}
                                        >
                                            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                        </select>
                                        <select
                                            value={invoiceYear}
                                            onChange={(e) => setInvoiceYear(parseInt(e.target.value))}
                                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}
                                        >
                                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Donor Information</p>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedMember.name}</h3>
                                    <p style={{ color: '#64748b', fontWeight: 500 }}>{selectedMember.email}</p>
                                    <p style={{ color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Member since {selectedMember.joined}</p>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Monthly Contribution</p>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                                        ${getMemberDonations(selectedMember.name).reduce((sum, tx) => sum + tx.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>
                                </div>
                            </div>

                            {/* Ledger Table */}
                            <div style={{ marginBottom: '4rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Transaction Details</p>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem 0', color: '#64748b', fontSize: '0.875rem' }}>Date</th>
                                            <th style={{ padding: '1rem 0', color: '#64748b', fontSize: '0.875rem' }}>Fund Allocation</th>
                                            <th style={{ padding: '1rem 0', color: '#64748b', fontSize: '0.875rem' }}>Description</th>
                                            <th style={{ padding: '1rem 0', textAlign: 'right', color: '#64748b', fontSize: '0.875rem' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getMemberDonations(selectedMember.name).map((tx, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '1.25rem 0', fontWeight: 600 }}>{tx.date}</td>
                                                <td style={{ padding: '1.25rem 0' }}>
                                                    <span style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>{tx.fund}</span>
                                                </td>
                                                <td style={{ padding: '1.25rem 0', color: '#64748b' }}>{tx.desc}</td>
                                                <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: 800 }}>${tx.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {getMemberDonations(selectedMember.name).length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No donations recorded for this period.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ padding: '3rem', backgroundColor: '#4f46e5', borderRadius: '32px', color: 'white', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>A Message from Your Church</h4>
                                <p style={{ fontSize: '1.125rem', lineHeight: 1.6, opacity: 0.9, fontWeight: 500 }}>
                                    Dear {selectedMember.name}, thank you for your faithful stewardship this month. Your contribution of <strong>${getMemberDonations(selectedMember.name).reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}</strong> helps us continue our mission of providing spiritual nourishment and community outreach. Your generosity empowers our ministries and transforms lives through faith.
                                </p>
                                <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 800, fontSize: '1rem' }}>{churchInfo?.name || 'Sanctuary'} Finance Team</p>
                                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Official Stewardship Certification</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                                <button className="btn" onClick={handleExportPDF} style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                    <Download size={18} /> Export PDF
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ background: 'var(--primary-dark)', padding: '1rem 2rem', fontSize: '0.875rem' }}
                                    onClick={() => window.print()}
                                >
                                    <Printer size={18} /> Print
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        background: sendSuccess ? 'var(--success)' : '#4f46e5',
                                        padding: '1rem 2.5rem',
                                        fontSize: '0.875rem',
                                        minWidth: '180px'
                                    }}
                                    onClick={handleSendEmail}
                                    disabled={isSending || sendSuccess}
                                >
                                    {isSending ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Send size={18} />
                                        </motion.div>
                                    ) : sendSuccess ? (
                                        "Email Sent!"
                                    ) : (
                                        <><Mail size={18} /> Send to Member</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MemberPortal;
