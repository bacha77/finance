import React, { useState } from 'react';
import {
    CreditCard,
    Smartphone,
    Banknote,
    ShieldCheck,
    ChevronRight,
    Apple
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const SmartGiving: React.FC = () => {
    const [amount, setAmount] = useState('100');
    const [fund, setFund] = useState('Tithe');
    const [frequency, setFrequency] = useState('One-time');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt)) return;

        setIsProcessing(true);
        try {
            const newTx = {
                id: `cont_${Date.now()}`,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                desc: `${fund} - Online Contribution`,
                cat: 'Income',
                dept: 'Tithes & Finance',
                fund: fund === 'Tithe' ? 'General Fund (Tithes)' : fund,
                fundId: fund === 'Tithe' ? 'gf' : fund.toLowerCase().replace(' ', '_'),
                amount: amt,
                type: 'in',
                member: 'Current User', // In a real app, use auth session user name
                method: 'ONLINE',
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('ledger').insert([newTx]);
            if (error) throw error;

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Error processing contribution:', err);
            alert('Payment processing failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ padding: '3rem 2rem' }}>
            <header style={{ marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>
                    Stewardship <span className="gradient-text">Streamlined</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Secure and intuitive contribution management for your mission.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Select Contribution</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '3rem' }}>
                        {['25', '50', '100', '250', '500', 'Custom'].map((val) => (
                            <button
                                key={val}
                                onClick={() => val !== 'Custom' && setAmount(val)}
                                className={amount === val ? "btn btn-primary" : "btn btn-ghost"}
                                style={{
                                    height: '4rem',
                                    borderRadius: 'var(--radius-lg)',
                                    fontSize: '1.25rem',
                                    fontWeight: 800
                                }}
                            >
                                {val === 'Custom' ? 'Other' : `$${val}`}
                            </button>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Designate Fund</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '4rem' }}>
                        {['Tithe', 'Building Fund', 'Missions', 'Youth', 'Benevolence'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFund(f)}
                                className={fund === f ? "btn btn-primary" : "btn btn-ghost"}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '30px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card" style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h4 style={{ fontWeight: 800, color: 'white', fontSize: '1.125rem' }}>Automated Stewardship</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Consistent support for your church's vision.</p>
                            </div>
                            <div style={{
                                width: '56px',
                                height: '28px',
                                borderRadius: '16px',
                                backgroundColor: frequency !== 'One-time' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                border: '1px solid var(--border)'
                            }} onClick={() => setFrequency(frequency === 'One-time' ? 'Monthly' : 'One-time')}>
                                <motion.div
                                    animate={{ x: frequency !== 'One-time' ? 28 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        backgroundColor: 'white',
                                        position: 'absolute',
                                        top: '1px',
                                        left: '1px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                />
                            </div>
                        </div>
                        {frequency !== 'One-time' && (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {['Weekly', 'Bi-weekly', 'Monthly'].map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => setFrequency(freq)}
                                        className={frequency === freq ? "btn btn-primary" : "btn btn-ghost"}
                                        style={{ flex: 1, padding: '12px', fontSize: '0.825rem' }}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2.5rem', color: 'white' }}>Final Review</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <button className="btn" style={{
                            width: '100%',
                            backgroundColor: 'white',
                            color: 'black',
                            gap: '12px',
                            height: '60px',
                            fontSize: '1.125rem',
                            fontWeight: 800,
                            borderRadius: '14px'
                        }}>
                            <Apple size={24} /> Pay with Apple
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>SECURE CARD PAYMENT</span>
                            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
                        </div>
                        <button className="btn btn-ghost" style={{ width: '100%', gap: '12px', height: '60px', justifyContent: 'space-between', padding: '0 1.5rem', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CreditCard size={24} className="gradient-text" />
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Credit or Debit Card</span>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                        <button className="btn btn-ghost" style={{ width: '100%', gap: '12px', height: '60px', justifyContent: 'space-between', padding: '0 1.5rem', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Banknote size={24} className="gradient-text" />
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Bank Transfer (ACH)</span>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Designated to {fund}</span>
                            <span style={{ fontWeight: 800, color: 'white' }}>${amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Schedule Type</span>
                            <span style={{ fontWeight: 800, color: 'white' }}>{frequency}</span>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                height: '64px',
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px -10px var(--primary-glow)',
                                backgroundColor: showSuccess ? 'var(--success)' : 'var(--primary)'
                            }}
                            onClick={handleConfirm}
                            disabled={showSuccess || isProcessing}
                        >
                            {showSuccess ? 'Stewardship Confirmed!' : isProcessing ? 'Processing...' : 'Confirm Stewardship'}
                        </button>
                    </div>

                    <div style={{
                        marginTop: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '0.75rem',
                        color: 'var(--success)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <ShieldCheck size={18} />
                        Military-grade 256-bit SSL Data Encryption
                    </div>
                </div>

                <div className="glass-card" style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <h4 style={{ fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'white' }}>
                        <Smartphone size={20} className="gradient-text" />
                        In-Person Giving
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Using a mobile terminal? Enable proximity giving to allow members to securely tap their devices.
                    </p>
                    <button className="btn btn-ghost" style={{ width: '100%' }}>
                        Pair New Terminal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartGiving;
