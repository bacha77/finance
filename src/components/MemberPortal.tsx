import React, { useState, useEffect } from 'react';
import {
    UserPlus,
    MessageSquare,
    BookOpen,
    Mail,
    MoreVertical,
    Clock,
    User,
    Send,
    FileText,
    Printer,
    Download,
    X,
    ShieldCheck,
    Heart,
    Globe,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Member {
    id?: string;
    name: string;
    email: string;
    role: string;
    joined: string;
    status: string;
}

interface ConnectCard {
    name: string;
    received: string;
    type: string;
    status: string;
    interest: string;
}

const DEFAULT_MEMBERS: Member[] = [
    { name: 'David Wilson', email: 'david.w@example.com', role: 'Member', joined: 'Jan 2024', status: 'Active' },
    { name: 'Emily Chen', email: 'emily.c@example.com', role: 'Volunteer', joined: 'Mar 2024', status: 'Active' },
    { name: 'Michael Brown', email: 'mbrown@example.com', role: 'Member', joined: 'Dec 2023', status: 'Inactive' },
    { name: 'Jessica Taylor', email: 'jtaylor@example.com', role: 'Deacon', joined: 'Jun 2022', status: 'Active' },
];

const DEFAULT_CONNECT_CARDS: ConnectCard[] = [
    { name: 'Robert Fox', received: '2 hours ago', type: 'Prayer Request', status: 'New', interest: 'Spiritual Growth' },
    { name: 'Esther Howard', received: '1 day ago', type: 'Visitor Information', status: 'Followed Up', interest: 'Youth Ministry' },
];

const MemberPortal: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState('members');
    const [showIntakeForm, setShowIntakeForm] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    const [members, setMembers] = useState<Member[]>(() => {
        const saved = localStorage.getItem('sanctuary_members');
        return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
    });

    const [connectCards, setConnectCards] = useState<ConnectCard[]>(() => {
        const saved = localStorage.getItem('sanctuary_connect_cards');
        return saved ? JSON.parse(saved) : DEFAULT_CONNECT_CARDS;
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

    useEffect(() => {
        localStorage.setItem('sanctuary_connect_cards', JSON.stringify(connectCards));
    }, [connectCards]);

    // Invoice / Statement Logic
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth());
    const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
    const [ledger, setLedger] = useState<any[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    const handleSendEmail = () => {
        setIsSending(true);
        // Simulate email API call
        setTimeout(() => {
            setIsSending(false);
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 3000);
        }, 2000);
    };

    useEffect(() => {
        const savedLedger = localStorage.getItem('sanctuary_ledger');
        if (savedLedger) setLedger(JSON.parse(savedLedger));
    }, [showInvoiceModal]);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

    // Form States
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Member');
    const [newMemberDept, setNewMemberDept] = useState('General');

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

    const [ccName, setCcName] = useState('');
    const [ccEmail, setCcEmail] = useState('');
    const [ccInterest, setCcInterest] = useState<string[]>([]);
    const [ccPrayer, setCcPrayer] = useState('');

    const interests = ['Volunteering', 'Small Groups', 'Youth Ministry', 'Worship Team', 'Outreach'];

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

        const newMember = {
            name: newMemberName,
            email: newMemberEmail,
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
        setActiveSubTab('members');
    };

    const handleConnectCardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ccName || !ccEmail) return;

        const newCard = {
            name: ccName,
            received: 'Just now',
            type: ccPrayer ? 'Prayer Request' : 'Visitor Information',
            status: 'New',
            interest: ccInterest[0] || 'General Inquiry'
        };

        setConnectCards([newCard, ...connectCards]);
        setShowIntakeForm(false);
        setCcName('');
        setCcEmail('');
        setCcInterest([]);
        setCcPrayer('');
    };

    const toggleInterest = (interest: string) => {
        setCcInterest(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                <div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                        Community <span className="gradient-text">Core</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Cultivating engagement and nurturing spiritual growth</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={handleBulkSend}
                        disabled={bulkSending}
                        style={{ position: 'relative' }}
                    >
                        {bulkSending ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Send size={18} /></motion.div>
                        ) : <Send size={18} />}
                        <span style={{ marginLeft: '8px' }}>Bulk Statements</span>
                        {bulkSending && (
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 3 }}
                                style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: 'var(--primary)' }}
                            />
                        )}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowIntakeForm(true)}>
                        <Mail size={18} /> Digital Card
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddMemberModal(true)}>
                        <UserPlus size={18} /> Add Member
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showIntakeForm && (
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
                        onClick={() => setShowIntakeForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 10, opacity: 0 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '680px',
                                borderRadius: '32px',
                                padding: '4rem',
                                boxShadow: 'var(--shadow-lg)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Digital Connect Card</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We'd love to get to know you better!</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            value={ccName}
                                            onChange={(e) => setCcName(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="email"
                                            placeholder="john@example.com"
                                            value={ccEmail}
                                            onChange={(e) => setCcEmail(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>I'm interested in...</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {interests.map(interest => (
                                        <button
                                            key={interest}
                                            type="button"
                                            onClick={() => toggleInterest(interest)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                backgroundColor: ccInterest.includes(interest) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                border: ccInterest.includes(interest) ? '1px solid var(--primary-light)' : '1px solid var(--border)',
                                                color: 'white',
                                                fontSize: '0.875rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}>
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>How can we pray for you?</label>
                                <textarea
                                    placeholder="Share your prayer requests..."
                                    value={ccPrayer}
                                    onChange={(e) => setCcPrayer(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', height: '100px', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn glass" style={{ flex: 1 }} onClick={() => setShowIntakeForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} onClick={handleConnectCardSubmit}>Submit Card</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
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
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Add New Member</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>Manually add a member to the database.</p>

                            <form onSubmit={handleAddMember}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>NAME</label>
                                    <input
                                        type="text"
                                        required
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>EMAIL</label>
                                    <input
                                        type="email"
                                        required
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>ROLE</label>
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
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>DEPARTMENT</label>
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
                                    <button type="button" className="btn glass" style={{ flex: 1 }} onClick={() => setShowAddMemberModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Member</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{
                display: 'flex',
                gap: '3rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '3rem',
                paddingBottom: '0.5rem'
            }}>
                {['members', 'impact', 'connect-cards', 'events', 'bulletins'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeSubTab === tab ? 'white' : 'var(--text-muted)',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            position: 'relative',
                            padding: '1rem 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            transition: 'color 0.2s'
                        }}
                    >
                        {tab.replace('-', ' ')}
                        {activeSubTab === tab && (
                            <motion.div
                                layoutId="activeSubTab"
                                style={{
                                    position: 'absolute',
                                    bottom: '-0.5rem',
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    backgroundColor: 'var(--primary)',
                                    borderRadius: '4px 4px 0 0'
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {activeSubTab === 'members' ? (
                        members.map((member: Member, idx: number) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.02)' }}
                                className="glass-card"
                                style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 2rem', borderRadius: 'var(--radius-lg)' }}
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
                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                            <Mail size={14} /> {member.email}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                            <Clock size={14} /> Joined {member.joined}
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
                                        <FileText size={16} /> Statement
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '8px' }}>
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : activeSubTab === 'impact' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="glass-card" style={{ padding: '3rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', border: 'none' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>Your Giving in Action</h3>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '2rem' }}>Because of your faithful stewardship, the Sanctuary community has achieved remarkable milestones this quarter. Explore how every contribution transforms lives.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    {[
                                        { label: 'Global Missions', value: '12', icon: Globe, suffix: 'Projects' },
                                        { label: 'Community Meals', value: '850', icon: Heart, suffix: 'Served' },
                                        { label: 'Youth Mentorship', value: '45', icon: Zap, suffix: 'Students' },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                                            <stat.icon size={24} color="white" style={{ marginBottom: '1rem' }} />
                                            <h4 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>{stat.value}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '2.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '2rem' }}>Major Project Progress</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {[
                                        { name: 'New Youth Center Wing', progress: 75, target: '$150k', color: 'var(--primary-light)' },
                                        { name: 'Panama Mission Trip', progress: 92, target: '$12k', color: 'var(--success)' },
                                        { name: 'Community Garden Initiative', progress: 40, target: '$5k', color: '#f59e0b' },
                                    ].map((project, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{project.name}</span>
                                                <span style={{ fontWeight: 800, color: project.color, fontSize: '0.95rem' }}>{project.progress}%</span>
                                            </div>
                                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${project.progress}%` }}
                                                    style={{ height: '100%', background: project.color, borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: {project.target}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Completion: Q3 2026</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <BookOpen size={48} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                            <p>Detailed view for {activeSubTab.replace('-', ' ')} coming soon.</p>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                            <MessageSquare size={20} className="gradient-text" />
                            Engagement Pulse
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {connectCards.map((card: ConnectCard, idx: number) => (
                                <div key={idx} style={{
                                    padding: '1.25rem',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>{card.name}</p>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.received}</span>
                                    </div>
                                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{card.type}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: card.status === 'New' ? 'var(--primary-light)' : 'var(--success)',
                                            backgroundColor: card.status === 'New' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            padding: '4px 10px',
                                            borderRadius: '6px'
                                        }}>
                                            {card.status}
                                        </span>
                                        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                                            Respond
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }}>
                            View Engagement Hub
                        </button>
                    </div>

                    <div className="card glass">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BookOpen size={20} color="var(--primary-light)" />
                            Digital Bulletin
                        </h3>
                        <div style={{ padding: '1rem', borderRadius: 'var(--radius)', backgroundColor: 'var(--primary)', color: 'white', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>NEXT SUNDAY</p>
                            <h4 style={{ fontWeight: 700, margin: '4px 0' }}>The Path of Grace</h4>
                            <p style={{ fontSize: '0.875rem' }}>Series: Foundations</p>
                        </div>
                        <button className="btn glass" style={{ width: '100%', fontSize: '0.875rem' }}>
                            Manage Sermon Notes
                        </button>
                    </div>
                </div>
            </div>

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '3rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Sanctuary Finance</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Church Administration & Stewardship</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h1 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '1rem' }}>Contribution Statement</h1>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '4rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Donor Information</p>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedMember.name}</h3>
                                    <p style={{ color: '#64748b', fontWeight: 500 }}>{selectedMember.email}</p>
                                    <p style={{ color: '#64748b', fontWeight: 500, marginTop: '4px' }}>Member since {selectedMember.joined}</p>
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>Total Monthly Contribution</p>
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

                            {/* Message Section */}
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
                                        <p style={{ fontWeight: 800, fontSize: '1rem' }}>Sanctuary Finance Team</p>
                                        <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Official Stewardship Certification</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <button className="btn" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                    <Download size={18} /> Export
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
