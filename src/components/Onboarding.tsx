import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
    Building2, MapPin, ChevronRight, Loader, 
    Mail, Phone, User, 
    Search, ShieldCheck,
    DollarSign, Globe
} from 'lucide-react';

interface OnboardingProps {
    userId: string;
    userEmail: string;
    initialName?: string;
    onComplete: () => void;
}

const CHURCH_SIZES = [
    { label: 'Small (< 100 members)', value: 'small' },
    { label: 'Medium (100–500 members)', value: 'medium' },
    { label: 'Large (500–2000 members)', value: 'large' },
    { label: 'Mega (2000+ members)', value: 'mega' },
];

const Onboarding: React.FC<OnboardingProps> = ({ userId, userEmail, initialName = '', onComplete }) => {
    const [step, setStep] = useState(1);
    const [churchName, setChurchName] = useState('');
    const [churchAddress, setChurchAddress] = useState('');
    const [churchCity, setChurchCity] = useState('');
    const [churchState, setChurchState] = useState('');
    const [churchZip, setChurchZip] = useState('');
    const [churchCountry, setChurchCountry] = useState('United States');
    const [denomination, setDenomination] = useState('');
    const [churchSize, setChurchSize] = useState('');
    
    const [adminName, setAdminName] = useState(initialName);
    const [adminPhone, setAdminPhone] = useState('');
    
    const [showTreasurer, setShowTreasurer] = useState(false);
    const [treasurerName, setTreasurerName] = useState('');
    const [treasurerEmail, setTreasurerEmail] = useState('');
    const [treasurerPhone, setTreasurerPhone] = useState('');
    
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Address Autocomplete Logic ──────────────────────────────────────────
    const searchAddress = async (query: string) => {
        setChurchAddress(query);
        if (query.length < 5) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        
        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
                const data = await resp.json();
                setAddressSuggestions(data);
                setShowSuggestions(true);
            } catch (err) {
                console.error('Address search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 600);
    };

    const selectAddress = (item: any) => {
        const addr = item.address;
        const street = `${addr.house_number || ''} ${addr.road || ''}`.trim() || item.display_name.split(',')[0];
        
        setChurchAddress(street);
        setChurchCity(addr.city || addr.town || addr.village || addr.suburb || '');
        setChurchState(addr.state || '');
        setChurchZip(addr.postcode || '');
        setChurchCountry(addr.country || 'United States');
        
        setAddressSuggestions([]);
        setShowSuggestions(false);
    };

    const handleComplete = async () => {
        if (!churchName || !adminName || !churchSize || !churchCity) {
            setError('Please complete all required fields (*)');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const { data: existing } = await supabase
                .from('churches')
                .select('id')
                .eq('name', churchName.trim())
                .eq('city', churchCity.trim())
                .maybeSingle();
            
            if (existing) {
                setError('This church workspace appears to already exist in this city.');
                setIsLoading(false);
                return;
            }

            // 1. Create the church record
            const { data: church, error: churchError } = await supabase
                .from('churches')
                .insert({
                    name: churchName.trim(),
                    address: churchAddress.trim(),
                    city: churchCity.trim(),
                    state: churchState.trim(),
                    zip: churchZip.trim(),
                    country: churchCountry.trim(),
                    denomination: denomination.trim(),
                    size: churchSize,
                    plan: 'trial',
                    owner_id: userId,
                    treasurer_name: treasurerName || null,
                    treasurer_email: treasurerEmail || null,
                    treasurer_phone: treasurerPhone || null,
                })
                .select()
                .single();

            if (churchError) throw churchError;

            // 2. Create the profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: userEmail,
                    full_name: adminName,
                    phone: adminPhone || null,
                    church_id: church.id,
                    role: 'admin',
                });

            if (profileError) throw profileError;

            onComplete();
        } catch (err: any) {
            setError(err.message || 'Setup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: any; required?: boolean; readOnly?: boolean }> = ({ label, value, onChange, placeholder, type = "text", icon: Icon, required, readOnly }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
                {Icon && <Icon size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />}
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className="glass-input"
                    style={{ 
                        width: '100%', 
                        paddingLeft: Icon ? '2.75rem' : '1rem',
                        opacity: readOnly ? 0.6 : 1,
                        cursor: readOnly ? 'not-allowed' : 'text'
                    }}
                />
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg-dark)', padding: '1.5rem',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background effects */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, transparent 80%)',
            }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                    width: '100%', maxWidth: '640px', background: 'var(--bg-card)', 
                    borderRadius: '32px', border: '1px solid var(--border)', 
                    boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6)',
                    overflow: 'hidden', position: 'relative', zIndex: 1 
                }}
            >
                {/* Header */}
                <div style={{ 
                    padding: '2.5rem 3.5rem 1.5rem', borderBottom: '1px solid var(--border)',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '12px', 
                            background: 'var(--primary)', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', boxShadow: '0 0 20px var(--primary-glow)' 
                        }}>
                            <Building2 size={24} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>Professional Church Onboarding</h1>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Workspace Infrastructure Setup</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ 
                                flex: 1, height: '4px', borderRadius: '2px', 
                                background: step >= i ? 'var(--primary)' : 'var(--border)',
                                transition: 'background 0.3s ease'
                            }} />
                        ))}
                    </div>
                </div>

                <div style={{ padding: '2.5rem 3.5rem' }}>
                    <AnimatePresence mode="wait">
                        
                        {/* ── STEP 1: IDENTITY ── */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>Church Information</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>The name of your church exactly as it should appear on reports.</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <Field label="Church Name" value={churchName} onChange={setChurchName} placeholder="e.g. Grace Fellowship" icon={Building2} required />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Denomination</label>
                                            <select value={denomination} onChange={e => setDenomination(e.target.value)} className="glass-input" style={{ width: '100%', colorScheme: 'dark' }}>
                                                <option value="">Select Option</option>
                                                {['Baptist', 'Methodist', 'Pentecostal', 'Non-denominational', 'Adventist', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Church Size *</label>
                                            <select value={churchSize} onChange={e => setChurchSize(e.target.value)} className="glass-input" style={{ width: '100%', colorScheme: 'dark' }}>
                                                <option value="">Select Size</option>
                                                {CHURCH_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setStep(2)} disabled={!churchName || !churchSize} className="btn btn-primary" style={{ width: '100%', marginTop: '3rem', height: '3.25rem', justifyContent: 'center', opacity: (!churchName || !churchSize) ? 0.5 : 1 }}>
                                    Next: Address <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 2: ADDRESS ── */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>Church Location</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Autocomplete will find your city, state and zip.</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Street Address *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input type="text" value={churchAddress} onChange={e => searchAddress(e.target.value)} placeholder="Type street address..." className="glass-input" style={{ width: '100%', paddingLeft: '2.75rem' }} />
                                            {isSearching && <Loader size={14} className="spin" style={{ position: 'absolute', right: '1rem', top: '50%', marginTop: '-7px', color: 'var(--primary)' }} />}
                                        </div>
                                        <AnimatePresence>
                                            {showSuggestions && addressSuggestions.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginTop: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                                    {addressSuggestions.map((item, i) => (
                                                        <button key={i} onClick={() => selectAddress(item)} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', gap: '10px' }}>
                                                            <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                            {item.display_name}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                        <Field label="City *" value={churchCity} onChange={setChurchCity} placeholder="Dallas" required />
                                        <Field label="State *" value={churchState} onChange={setChurchState} placeholder="TX" required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <Field label="Zip / Postal" value={churchZip} onChange={setChurchZip} placeholder="75201" />
                                        <Field label="Country" value={churchCountry} onChange={setChurchCountry} icon={Globe} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button onClick={() => setStep(1)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                                    <button onClick={() => setStep(3)} disabled={!churchCity} className="btn btn-primary" style={{ flex: 2 }}>Next: Your Profile</button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3: ADMIN ── */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>Administrator Account</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This information is for the primary workspace manager.</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <Field label="Full Name *" value={adminName} onChange={setAdminName} icon={User} required />
                                    <Field label="Email Address" value={userEmail} onChange={() => {}} readOnly icon={Mail} />
                                    <Field label="Contact Phone" value={adminPhone} onChange={setAdminPhone} placeholder="+1 (555) 000-0000" icon={Phone} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button onClick={() => setStep(2)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                                    <button onClick={() => setStep(4)} disabled={!adminName} className="btn btn-primary" style={{ flex: 2 }}>Next: Financial Contact</button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 4: TREASURER ── */}
                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>Financial Officer</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Optionally add your Church Treasurer for tax compliance access.</p>
                                </div>
                                
                                {!showTreasurer ? (
                                    <div onClick={() => setShowTreasurer(true)} style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.borderColor='var(--primary)'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                                        <DollarSign size={24} color="var(--primary-light)" style={{ marginBottom: '1rem' }} />
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Add Church Treasurer Details</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This can also be added later in settings.</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                                        <button onClick={() => setShowTreasurer(false)} style={{ position: 'absolute', top: '-2.5rem', right: 0, background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>REMOVE</button>
                                        <Field label="Treasurer Name" value={treasurerName} onChange={setTreasurerName} icon={User} />
                                        <Field label="Treasurer Email" value={treasurerEmail} onChange={setTreasurerEmail} icon={Mail} />
                                        <Field label="Treasurer Phone" value={treasurerPhone} onChange={setTreasurerPhone} icon={Phone} />
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(124,58,237,0.06)', borderRadius: '12px', display: 'flex', gap: '10px' }}>
                                    <ShieldCheck size={18} color="var(--primary-light)" style={{ flexShrink: 0 }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>By launching, you agree to the Church Data Protection Agreement. A secure database shard has been provisioned.</div>
                                </div>

                                {error && (
                                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                    <button onClick={() => setStep(3)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                                    <button onClick={handleComplete} disabled={isLoading} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                                        {isLoading ? <Loader size={18} className="spin" /> : <>Launch Workspace 🚀</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
