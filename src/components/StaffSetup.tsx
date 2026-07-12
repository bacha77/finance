import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { User, Clock, Loader2, ArrowRight } from 'lucide-react';

interface StaffSetupProps {
    profile: any;
    onComplete: () => void;
}

const StaffSetup: React.FC<StaffSetupProps> = ({ profile, onComplete }) => {
    const [workingHours, setWorkingHours] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!workingHours.trim()) {
            setError('Please enter your available working hours.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ working_hours: workingHours })
                .eq('id', profile.id);

            if (updateError) throw updateError;
            
            // Allow parent component to refetch profile
            onComplete();
        } catch (err: any) {
            console.error('Failed to save working hours:', err);
            setError(err.message || 'An error occurred while saving.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-main))', padding: '2rem' }}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsla(var(--p)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <User size={32} color="hsl(var(--p))" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Complete Your Setup</h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Welcome to the team, {profile.full_name}! Please set your available working hours so clients and team members know when they can reach you.</p>
                </div>

                {error && (
                    <div style={{ background: 'hsla(var(--error)/0.1)', border: '1px solid hsla(var(--error)/0.2)', padding: '1rem', borderRadius: '8px', color: 'hsl(var(--error))', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Available Working Hours
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Clock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                        <input
                            type="text"
                            value={workingHours}
                            onChange={(e) => setWorkingHours(e.target.value)}
                            placeholder="e.g. Mon-Fri, 9AM - 5PM EST"
                            className="glass-input"
                            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', background: 'hsla(var(--text-main)/0.03)', border: '1px solid hsla(var(--text-main)/0.1)', color: 'white', fontSize: '1rem' }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {loading ? <Loader2 size={20} className="spin" /> : (
                        <>
                            Save & Go to Dashboard <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
};

export default StaffSetup;
