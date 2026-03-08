import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Building2, Users, MapPin, ChevronRight, Loader } from 'lucide-react';

interface OnboardingProps {
    userId: string;
    userEmail: string;
    onComplete: () => void;
}

const CHURCH_SIZES = [
    { label: 'Small (< 100 members)', value: 'small' },
    { label: 'Medium (100–500 members)', value: 'medium' },
    { label: 'Large (500–2000 members)', value: 'large' },
    { label: 'Mega (2000+ members)', value: 'mega' },
];

const Onboarding: React.FC<OnboardingProps> = ({ userId, userEmail, onComplete }) => {
    const [step, setStep] = useState(1);
    const [churchName, setChurchName] = useState('');
    const [churchCity, setChurchCity] = useState('');
    const [churchState, setChurchState] = useState('');
    const [churchSize, setChurchSize] = useState('');
    const [adminName, setAdminName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleComplete = async () => {
        if (!churchName || !adminName || !churchSize) {
            setError('Please fill in all required fields.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            // 1. Create the church record
            const { data: church, error: churchError } = await supabase
                .from('churches')
                .insert({
                    name: churchName,
                    city: churchCity,
                    state: churchState,
                    size: churchSize,
                    plan: 'trial',
                    owner_id: userId,
                })
                .select()
                .single();

            if (churchError) throw churchError;

            // 2. Create the profile linking the user to this church
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: userEmail,
                    full_name: adminName,
                    church_id: church.id,
                    role: 'admin',
                });

            if (profileError) throw profileError;

            onComplete();
        } catch (err: any) {
            setError(err.message || 'Could not set up your church. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg-dark)', padding: '2rem',
        }}>
            {/* Background glow */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '520px', padding: '3.5rem', borderRadius: '28px', position: 'relative', zIndex: 1 }}
            >
                {/* Progress bar */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Step {step} of 2</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 700 }}>{step === 1 ? 'Church Details' : 'Your Profile'}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', overflow: 'hidden' }}>
                        <motion.div
                            animate={{ width: `${(step / 2) * 100}%` }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), #a78bfa)', borderRadius: '100px' }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>
                </div>

                {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '18px',
                                background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--primary-light)',
                            }}>
                                <Building2 size={28} />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                                Welcome to <span style={{ background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Storehouse Finance</span>
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Let's set up your church's financial workspace.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Church Name *
                                </label>
                                <input
                                    type="text"
                                    value={churchName}
                                    onChange={e => setChurchName(e.target.value)}
                                    placeholder="e.g. Grace Community Church"
                                    className="glass-input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <MapPin size={11} style={{ display: 'inline', marginRight: '4px' }} />City
                                    </label>
                                    <input
                                        type="text"
                                        value={churchCity}
                                        onChange={e => setChurchCity(e.target.value)}
                                        placeholder="City"
                                        className="glass-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State</label>
                                    <input
                                        type="text"
                                        value={churchState}
                                        onChange={e => setChurchState(e.target.value)}
                                        placeholder="FL"
                                        className="glass-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Users size={11} style={{ display: 'inline', marginRight: '4px' }} />Congregation Size *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {CHURCH_SIZES.map(s => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => setChurchSize(s.value)}
                                            style={{
                                                padding: '0.85rem', borderRadius: '12px', border: '1px solid',
                                                borderColor: churchSize === s.value ? 'var(--primary)' : 'var(--border)',
                                                background: churchSize === s.value ? 'rgba(124,58,237,0.12)' : 'transparent',
                                                color: churchSize === s.value ? 'var(--primary-light)' : 'var(--text-secondary)',
                                                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!churchName || !churchSize}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '2rem', justifyContent: 'center', opacity: (!churchName || !churchSize) ? 0.5 : 1 }}
                        >
                            Continue <ChevronRight size={18} />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.5rem' }}>Your Profile</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You'll be the admin for <strong style={{ color: 'white' }}>{churchName}</strong>.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Your Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={e => setAdminName(e.target.value)}
                                    placeholder="e.g. Pastor James Thompson"
                                    className="glass-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    readOnly
                                    className="glass-input"
                                    style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                                />
                            </div>

                            <div style={{
                                padding: '1rem', borderRadius: '14px',
                                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                            }}>
                                <p style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                                    🎉 Your free 30-day trial starts automatically. No credit card required.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>{error}</p>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                onClick={() => setStep(1)}
                                className="btn btn-ghost"
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={isLoading || !adminName}
                                className="btn btn-primary"
                                style={{ flex: 2, justifyContent: 'center', opacity: (!adminName || isLoading) ? 0.6 : 1 }}
                            >
                                {isLoading ? <><Loader size={16} className="spin" /> Setting up...</> : <>Launch My Workspace 🚀</>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default Onboarding;
