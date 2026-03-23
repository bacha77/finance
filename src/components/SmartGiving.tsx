import React, { useState } from 'react';
import {
    CreditCard,
    Smartphone,
    Banknote,
    ShieldCheck,
    ChevronRight,
    Apple
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { PAYPAL_CLIENT_ID } from '../lib/subscriptionConfig';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const SmartGiving: React.FC = () => {
    const [amount, setAmount] = useState('100');
    const [customAmount, setCustomAmount] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [fund, setFund] = useState('General Fund');
    const [availableFunds, setAvailableFunds] = useState<{ id: string, name: string }[]>([]);
    const [frequency, setFrequency] = useState('One-time');
    const [paymentMethod, setPaymentMethod] = useState<'none' | 'card' | 'paypal' | 'ach'>('none');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentContributions, setRecentContributions] = useState<any[]>([]);
    const [churchId, setChurchId] = useState<string | null>(null);

    React.useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single();
                if (profile?.church_id) {
                    setChurchId(profile.church_id);
                    const { data: funds } = await supabase.from('funds').select('id, name').eq('church_id', profile.church_id);
                    if (funds && funds.length > 0) {
                        setAvailableFunds(funds);
                        setFund(funds[0].name);
                    }

                    const { data: history } = await supabase.from('ledger')
                        .select('*')
                        .eq('church_id', profile.church_id)
                        .eq('category', 'Income')
                        .order('created_at', { ascending: false })
                        .limit(5);
                    if (history) setRecentContributions(history);
                }
            }
        };
        loadInitialData();
    }, [showSuccess]);

    const finalAmount = isCustom ? parseFloat(customAmount) : parseFloat(amount);

    const handleConfirm = async () => {
        const amt = finalAmount;
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid contribution amount.');
            return;
        }

        setIsProcessing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const selectedFund = availableFunds.find(f => f.name === fund);
            const newTx = {
                date: new Date().toISOString().split('T')[0],
                description: `${fund} - Online Contribution (${frequency})`,
                category: 'Income',
                department: 'Stewardship',
                fund: fund,
                fund_id: selectedFund?.id,
                amount: amt,
                type: 'in',
                method: paymentMethod.toUpperCase(),
                church_id: churchId,
                created_at: new Date().toISOString()
            };

            const { error: txError } = await supabase.from('ledger').insert([newTx]);
            if (txError) throw txError;

            // Update fund balance
            if (selectedFund && churchId) {
                const { data: currentFund } = await supabase.from('funds').select('balance').eq('id', selectedFund.id).single();
                if (currentFund) {
                    await supabase.from('funds').update({ balance: currentFund.balance + amt }).eq('id', selectedFund.id);
                }
            }

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

            <div className="flexible-grid" style={{ gap: '3rem' }}>
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Select Contribution</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {['25', '50', '100', '250', '500', 'Custom'].map((val) => (
                            <button
                                key={val}
                                onClick={() => {
                                    if (val === 'Custom') {
                                        setIsCustom(true);
                                    } else {
                                        setIsCustom(false);
                                        setAmount(val);
                                    }
                                }}
                                className={(isCustom && val === 'Custom') || (!isCustom && amount === val) ? "btn btn-primary" : "btn btn-ghost"}
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

                    {isCustom && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ marginBottom: '3rem' }}
                        >
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>$</span>
                                <input 
                                    type="number"
                                    placeholder="Enter amount"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '2px solid var(--primary)',
                                        borderRadius: '16px',
                                        padding: '1.25rem 1rem 1.25rem 2.5rem',
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}

                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Designate Fund</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '4rem' }}>
                        {(availableFunds.length > 0 ? availableFunds.map(f => f.name) : []).map((f) => (
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
                        <button 
                            className="btn" 
                            onClick={() => alert('Apple Pay is currently only supported in mobile Safari or with a pre-configured Apple Merchant ID.')}
                            style={{
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
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>SELECT PAYMENT METHOD</span>
                            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
                        </div>

                        <button 
                            onClick={() => setPaymentMethod('card')}
                            className="btn btn-ghost" 
                            style={{ 
                                width: '100%', gap: '12px', height: '60px', justifyContent: 'space-between', padding: '0 1.5rem', borderRadius: '14px',
                                border: paymentMethod === 'card' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: paymentMethod === 'card' ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CreditCard size={24} className="gradient-text" />
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Credit or Debit Card</span>
                            </div>
                            <ChevronRight size={20} />
                        </button>

                        <AnimatePresence>
                            {paymentMethod === 'card' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input 
                                            placeholder="Card Number" 
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '8px', color: 'white' }}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <input placeholder="MM/YY" style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '8px', color: 'white' }} />
                                            <input placeholder="CVC" style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '8px', color: 'white' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button 
                            onClick={() => setPaymentMethod('paypal')}
                            className="btn btn-ghost" 
                            style={{ 
                                width: '100%', gap: '12px', height: '60px', justifyContent: 'space-between', padding: '0 1.5rem', borderRadius: '14px',
                                border: paymentMethod === 'paypal' ? '1px solid #0070ba' : '1px solid var(--border)',
                                background: paymentMethod === 'paypal' ? 'rgba(0, 112, 186, 0.05)' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Smartphone size={24} color="#0070ba" />
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>PayPal Checkout</span>
                            </div>
                            <ChevronRight size={20} />
                        </button>

                        <AnimatePresence>
                            {paymentMethod === 'paypal' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ padding: '1rem', marginTop: '1rem' }}>
                                        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
                                            <PayPalButtons 
                                                style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
                                                createOrder={(_data, actions) => {
                                                    return actions.order.create({
                                                        intent: 'CAPTURE',
                                                        purchase_units: [{
                                                            description: `${fund} Donation`,
                                                            amount: { 
                                                            currency_code: 'USD',
                                                            value: finalAmount.toString() 
                                                        }
                                                        }]
                                                    });
                                                }}
                                                onApprove={async (_data, actions) => {
                                                    await actions?.order?.capture();
                                                    handleConfirm();
                                                }}
                                            />
                                        </PayPalScriptProvider>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button 
                            onClick={() => setPaymentMethod('ach')}
                            className="btn btn-ghost" 
                            style={{ 
                                width: '100%', gap: '12px', height: '60px', justifyContent: 'space-between', padding: '0 1.5rem', borderRadius: '14px',
                                border: paymentMethod === 'ach' ? '1px solid #10b981' : '1px solid var(--border)',
                                background: paymentMethod === 'ach' ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                            }}
                        >
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
                            <span style={{ fontWeight: 800, color: 'white' }}>${finalAmount || 0}</span>
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
                            disabled={showSuccess || isProcessing || paymentMethod === 'none'}
                        >
                            {showSuccess ? 'Stewardship Confirmed!' : isProcessing ? 'Processing Contribution...' : paymentMethod === 'none' ? 'Select Payment Method' : 'Confirm Stewardship'}
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

            {recentContributions.length > 0 && (
                <div style={{ marginTop: '5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Impact</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {recentContributions.map((c, i) => (
                            <motion.div 
                                key={c.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card"
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'white' }}>{c.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.date} via {c.method}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10b981' }}>
                                    +${c.amount}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartGiving;
