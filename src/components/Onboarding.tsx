import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
    Building2, MapPin, Loader2, 
    Mail, Phone, User, LogOut,
    Search, ShieldCheck,
    DollarSign, Globe, CheckCircle2,
    Sparkles, Database, ArrowRight
} from 'lucide-react';

interface OnboardingProps {
    userId: string;
    userEmail: string;
    initialName?: string;
    onComplete: () => void;
    onLogout: () => void;
}

// ──────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS (Outside to prevent re-renders)
// ──────────────────────────────────────────────────────────────────────────

const CHURCH_SIZES = [
    { label: 'Small (0-100)', value: 'small', desc: 'Growing community foundations' },
    { label: 'Medium (100-500)', value: 'medium', desc: 'Expanding ministry operations' },
    { label: 'Large (500-2000)', value: 'large', desc: 'Established multi-ministry' },
    { label: 'Mega (2000+)', value: 'mega', desc: 'Institutional level enterprise' },
];

const ONBOARDING_STEPS = [
    { id: 1, title: 'Personal Identity', icon: User },
    { id: 2, title: 'Church Mission', icon: Building2 },
    { id: 3, title: 'Location Sync', icon: MapPin },
    { id: 4, title: 'Financial Oversight', icon: ShieldCheck },
];

// ── Shared Input Component (DEFINED OUTSIDE) ──
const OnboardingInput = ({ label, value, onChange, placeholder, type = "text", icon: Icon, required, readOnly }: any) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <div style={{ position: 'relative' }}>
            {Icon && <Icon size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />}
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className="glass-input"
                autoFocus={false}
                style={{ 
                    width: '100%', padding: '0.875rem 1rem', paddingLeft: Icon ? '3.25rem' : '1.25rem',
                    borderRadius: '14px', background: 'hsla(var(--text-main)/0.03)',
                    border: '1px solid hsla(var(--text-main)/0.1)', color: 'white',
                    fontSize: '0.95rem', transition: 'all 0.2s',
                    opacity: readOnly ? 0.6 : 1
                }}
            />
        </div>
    </div>
);

// ──────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────

const Onboarding: React.FC<OnboardingProps> = ({ userId, userEmail, initialName = '', onComplete, onLogout }) => {
    const [step, setStep] = useState(1);
    
    // Form State
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
    const [treasurerName, setTreasurerName] = useState('');
    const [treasurerEmail, setTreasurerEmail] = useState('');
    const [treasurerPhone, setTreasurerPhone] = useState('');
    
    // UI State
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
            setError('Please fill in all required fields to continue.');
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

            // Initialize Church Assets
            await supabase.from('funds').insert({
                name: 'General Fund',
                description: 'Primary operating fund for tithes and offerings',
                balance: 0,
                church_id: church.id,
                is_unrestricted: true
            });

            await supabase.from('departments').insert({
                name: 'General',
                church_id: church.id
            });

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

    return (
        <div className="onboarding-container" style={{
            minHeight: '100vh', display: 'flex', background: 'hsl(var(--bg-main))',
            color: 'white', overflow: 'auto', flexDirection: window.innerWidth < 1024 ? 'column' : 'row'
        }}>
            {/* ── LEFT SIDE: BRANDING/PROGRESS ── */}
            <div style={{ 
                width: window.innerWidth < 1024 ? '100%' : '400px', flexShrink: 0, background: 'hsl(var(--bg-card))',
                borderRight: window.innerWidth < 1024 ? 'none' : '1px solid hsla(var(--text-main)/0.05)',
                borderBottom: window.innerWidth < 1024 ? '1px solid hsla(var(--text-main)/0.05)' : 'none',
                display: 'flex', flexDirection: 'column', padding: window.innerWidth < 1024 ? '2rem' : '3rem',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'hsl(var(--p))', filter: 'blur(100px)', borderRadius: '50%' }} />
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'hsl(var(--p))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={20} color="white" />
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Sanctuary Finance</span>
                    </div>

                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        Foundation for <span style={{ color: 'hsl(var(--p))' }}>Growth.</span>
                    </h1>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '4rem' }}>
                        Complete your workspace configuration to unlock institutional-grade church management tools.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {ONBOARDING_STEPS.map((s) => {
                            const isActive = step === s.id;
                            const isPast = step > s.id;
                            return (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', opacity: isActive || isPast ? 1 : 0.3, transition: 'all 0.4s' }}>
                                    <div style={{ 
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: isPast ? 'hsl(var(--success))' : isActive ? 'hsl(var(--p))' : 'transparent',
                                        border: isPast || isActive ? 'none' : '2px solid hsla(var(--text-main)/0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {isPast ? <CheckCircle2 size={16} color="white" /> : <s.icon size={14} color={isActive ? 'white' : 'white'} />}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 800 : 500, color: isActive ? 'white' : 'hsl(var(--text-muted))' }}>
                                        {s.title}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        <Database size={14} /> Shard Provisioned
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        <ShieldCheck size={14} /> SEC Compliant
                    </div>
                </div>

                <button 
                    onClick={onLogout}
                    style={{
                        marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '8px', 
                        background: 'none', border: 'none', color: 'hsla(var(--text-main)/0.4)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        padding: '10px', borderRadius: '8px', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.color = 'white'}
                    onMouseOut={e => e.currentTarget.style.color = 'hsla(var(--text-main)/0.4)'}
                >
                    <LogOut size={14} /> Sign out and return to login
                </button>
            </div>

            {/* ── RIGHT SIDE: DYNAMIC FORM ── */}
            <div style={{ flex: 1, padding: window.innerWidth < 1024 ? '2rem 1rem' : '4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div 
                    layout={true}
                    style={{ width: '100%', maxWidth: '560px' }}
                >
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="s1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            >
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--p))', textTransform: 'uppercase', marginBottom: '8px' }}>Personal Profile</div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Who are you within the ministry?</h2>
                                </div>
                                <OnboardingInput label="Full Name" value={adminName} onChange={setAdminName} icon={User} required placeholder="Your professional name" />
                                <OnboardingInput label="Official Email" value={userEmail} onChange={() => {}} readOnly icon={Mail} />
                                <OnboardingInput label="Phone Number" value={adminPhone} onChange={setAdminPhone} icon={Phone} placeholder="+1 (555) 000-0000" />
                                
                                <button onClick={() => setStep(2)} disabled={!adminName} className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', height: '3.5rem', borderRadius: '16px', fontSize: '1rem' }}>
                                    Continue to Church Mission <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            >
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--p))', textTransform: 'uppercase', marginBottom: '8px' }}>Ministry Identity</div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Tell us about the church.</h2>
                                </div>
                                <OnboardingInput label="Church / Organization Name" value={churchName} onChange={setChurchName} icon={Building2} required placeholder="e.g. Grace Fellowship" />
                                
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                        Church Size / Attendance
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {CHURCH_SIZES.map(size => (
                                            <button 
                                                key={size.value}
                                                onClick={() => setChurchSize(size.value)}
                                                style={{ 
                                                    padding: '1.25rem', borderRadius: '16px', textAlign: 'left',
                                                    background: churchSize === size.value ? 'hsl(var(--p))' : 'hsla(var(--text-main)/0.03)',
                                                    border: '1px solid', borderColor: churchSize === size.value ? 'hsl(var(--p))' : 'hsla(var(--text-main)/0.1)',
                                                    color: 'white', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{size.label}</div>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px' }}>{size.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <OnboardingInput label="Denomination (Optional)" value={denomination} onChange={setDenomination} icon={Globe} placeholder="e.g. Pentecostal" />

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                                        Back
                                    </button>
                                    <button onClick={() => setStep(3)} disabled={!churchName || !churchSize} className="btn btn-primary" style={{ flex: 1, height: '3.5rem', borderRadius: '16px' }}>
                                        Continue to Location <ArrowRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="s3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            >
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--p))', textTransform: 'uppercase', marginBottom: '8px' }}>Physical Workspace</div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Where is the ministry located?</h2>
                                </div>
                                
                                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                    <OnboardingInput label="Official Address" value={churchAddress} onChange={searchAddress} icon={Search} required placeholder="Search by street or city..." />
                                    {isSearching && <Loader2 size={16} className="spin" style={{ position: 'absolute', right: '1.25rem', top: '2.5rem', color: 'hsl(var(--p))' }} />}
                                    
                                    <AnimatePresence>
                                        {showSuggestions && addressSuggestions.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--text-main)/0.1)', borderRadius: '16px', marginTop: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                                                {addressSuggestions.map((item, i) => (
                                                    <button key={i} onClick={() => selectAddress(item)} style={{ width: '100%', padding: '1rem', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid hsla(var(--text-main)/0.05)', color: 'white', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', gap: '12px', transition: 'background 0.2s' }}>
                                                        <MapPin size={16} style={{ flexShrink: 0, color: 'hsl(var(--p))' }} />
                                                        {item.display_name}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <OnboardingInput label="City" value={churchCity} onChange={setChurchCity} required />
                                    <OnboardingInput label="State / Province" value={churchState} onChange={setChurchState} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <OnboardingInput label="Postal Code" value={churchZip} onChange={setChurchZip} />
                                    <OnboardingInput label="Country" value={churchCountry} onChange={setChurchCountry} />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                                        Back
                                    </button>
                                    <button onClick={() => setStep(4)} disabled={!churchCity || !churchAddress} className="btn btn-primary" style={{ flex: 1, height: '3.5rem', borderRadius: '16px' }}>
                                        Finalize Setup <ArrowRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="s4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                            >
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--p))', textTransform: 'uppercase', marginBottom: '8px' }}>Security & Audit</div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Who handles the treasury?</h2>
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>Optional: Assigning a treasurer now simplifies financial audit trails later.</p>
                                </div>

                                <OnboardingInput label="Treasurer Name" value={treasurerName} onChange={setTreasurerName} icon={DollarSign} placeholder="Assign treasury contact..." />
                                <OnboardingInput label="Treasurer Email" value={treasurerEmail} onChange={setTreasurerEmail} icon={Mail} />
                                <OnboardingInput label="Treasurer Phone" value={treasurerPhone} onChange={setTreasurerPhone} icon={Phone} />
                                
                                <div style={{ background: 'hsla(var(--p)/0.05)', border: '1px solid hsla(var(--p)/0.2)', padding: '1.25rem', borderRadius: '16px', marginTop: '2.5rem' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <ShieldCheck size={20} color="hsl(var(--p))" style={{ flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
                                            <strong>Deployment Ready:</strong> Click below to initialize your church shard. You'll start with a 30-day Enterprise Trial.
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div style={{ marginTop: '1.5rem', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                                        Back
                                    </button>
                                    <button 
                                        onClick={handleComplete} 
                                        disabled={isLoading}
                                        className="btn btn-primary" 
                                        style={{ flex: 1, height: '3.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {isLoading ? <Loader2 size={24} className="spin" /> : 'Launch Church Workspace 🚀'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default Onboarding;
