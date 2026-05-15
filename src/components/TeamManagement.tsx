import React, { useState, useEffect } from 'react';
import { 
    UserPlus, 
    Mail, 
    Shield, 
    Trash2, 
    X, 
    CheckCircle2, 
    Clock,
    ShieldCheck,
    UserCircle,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { sendResendEmail } from '../lib/resend';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

interface Invite {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

interface TeamManagementProps {
    churchId: string;
    currentUserId: string;
    currentUserRole: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ churchId, currentUserId, currentUserRole }) => {
    const isAdminUser = currentUserRole?.toLowerCase().includes('admin');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [churchName, setChurchName] = useState('');
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    
    // Invite Form State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('admin');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchData = async () => {
        if (!churchId) return;
        setLoading(true);
        try {
            // Fetch Profiles
            const { data: profileData, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('church_id', churchId);
            
            if (profileErr) throw profileErr;
            setProfiles(profileData || []);

            // Fetch Church Name
            const { data: church, error: churchErr } = await supabase
                .from('churches')
                .select('name')
                .eq('id', churchId)
                .single();
            if (!churchErr) setChurchName(church.name);

            // Fetch Pending Invites
            const { data: inviteData, error: inviteErr } = await supabase
                .from('invites')
                .select('*')
                .eq('church_id', churchId);
            
            if (inviteErr) throw inviteErr;
            setInvites(inviteData || []);

        } catch (err) {
            console.error('Error fetching team data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [churchId]);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdminUser) {
            alert("Only the Main Treasurer can invite new members.");
            return;
        }
        if (!inviteEmail.trim()) return;
        
        setIsInviting(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            // Check if user already exists in this church
            const existing = profiles.find(p => p.email.toLowerCase() === inviteEmail.toLowerCase());
            if (existing) {
                throw new Error('User is already a member of this church.');
            }

            // Check if invite already exists
            const existingInvite = invites.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase());
            if (existingInvite) {
                throw new Error('An invite has already been sent to this email.');
            }

            const { error } = await supabase
                .from('invites')
                .insert([{
                    email: inviteEmail.toLowerCase().trim(),
                    church_id: churchId,
                    role: inviteRole,
                    invited_by: currentUserId
                }]);

            if (error) throw error;

            // Send physical email invite
            try {
                const signupUrl = `${window.location.origin}${window.location.pathname}#/signup?email=${encodeURIComponent(inviteEmail)}`;
                await sendResendEmail(
                    inviteEmail.toLowerCase().trim(),
                    `Join the ${churchName || 'Church'} Finance Team`,
                    `
                    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1e293b;">
                        <div style="text-align: center; margin-bottom: 32px;">
                            <div style="display: inline-block; padding: 12px; background: #f1f5f9; border-radius: 16px;">
                                <img src="https://storehousefinance.net/logo.png" alt="Logo" style="width: 48px; height: 48px; display: block;">
                            </div>
                        </div>
                        <h1 style="font-size: 24px; font-weight: 800; text-align: center; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.02em;">Welcome to the Team!</h1>
                        <p style="font-size: 16px; line-height: 1.6; color: #475569; text-align: center; margin-bottom: 32px;">
                            You have been invited to help manage the stewardship and financial records for <strong>${churchName || 'your church'}</strong>. Your contribution will help ensure transparency and accuracy in our ministry's finances.
                        </p>
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="${signupUrl}" style="background-color: #2563eb; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">
                                Accept Invitation & Set Password
                            </a>
                        </div>
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
                            <p style="font-size: 13px; color: #94a3b8; margin: 0;">
                                Note: This invitation was sent to ${inviteEmail}. If you didn't expect this, you can safely ignore this email.
                            </p>
                        </div>
                    </div>
                    `,
                    churchName || 'Storehouse Finance'
                );
            } catch (emailErr) {
                console.warn('Database invite created, but email failed to send:', emailErr);
                alert('Invitation saved in the database, but the email could not be sent. Please use the "Copy Link" button to send the invitation manually.');
            }

            setInviteSuccess(true);
            setInviteEmail('');
            fetchData();
            setTimeout(() => {
                setShowInviteModal(false);
                setInviteSuccess(false);
            }, 2000);

        } catch (err: any) {
            setInviteError(err.message || 'Failed to send invite');
        } finally {
            setIsInviting(false);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!isAdminUser) return;
        // Removed confirm() as it can be blocked by browsers
        setCancellingId(inviteId);
        try {
            console.log('Attempting to cancel invite:', inviteId);
            const { error } = await supabase
                .from('invites')
                .delete()
                .eq('id', inviteId);
            
            if (error) {
                alert(`Error: ${error.message}`);
                throw error;
            }
            
            setInvites(prev => prev.filter(i => i.id !== inviteId));
        } catch (err) {
            console.error('Error cancelling invite:', err);
        } finally {
            setCancellingId(null);
        }
    };

    const copyInviteLink = async (email: string, inviteId: string) => {
        const signupUrl = `${window.location.origin}${window.location.pathname}#/signup?email=${encodeURIComponent(email)}`;
        
        try {
            // Modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(signupUrl);
                setCopiedId(inviteId);
                setTimeout(() => setCopiedId(null), 2000);
                return;
            }
            throw new Error('Clipboard API unavailable');
        } catch (err) {
            // Robust Fallback (Hidden Textarea)
            try {
                const textArea = document.createElement("textarea");
                textArea.value = signupUrl;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopiedId(inviteId);
                    setTimeout(() => setCopiedId(null), 2000);
                } else {
                    prompt("Could not auto-copy. Please copy this link manually:", signupUrl);
                }
            } catch (fallbackErr) {
                prompt("Please copy this link manually:", signupUrl);
            }
        }
    };

    const handleRemoveMember = async (profileId: string) => {
        if (!isAdminUser) {
            alert("Only the Main Treasurer can remove members.");
            return;
        }
        if (profileId === currentUserId) {
            alert("You cannot remove yourself.");
            return;
        }
        if (!confirm('Remove this member from the church? They will no longer be able to access any data.')) return;
        
        try {
            // Update profile to have no church_id
            const { error } = await supabase
                .from('profiles')
                .update({ church_id: null })
                .eq('id', profileId);
            
            if (error) throw error;
            setProfiles(prev => prev.filter(p => p.id !== profileId));
        } catch (err) {
            console.error('Error removing member:', err);
        }
    };

    const getRoleBadge = (role: string) => {
        const isAdmin = role.toLowerCase().includes('admin');
        const isAssistant = role.toLowerCase().includes('assistant');
        
        let label = role;
        if (isAdmin) label = 'Main Treasurer';
        if (isAssistant) label = 'Assistant Treasurer';

        return (
            <span style={{ 
                padding: '4px 8px', 
                borderRadius: '6px', 
                fontSize: '0.7rem', 
                fontWeight: 800, 
                textTransform: 'uppercase',
                background: isAdmin ? 'rgba(99, 102, 241, 0.1)' : isAssistant ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: isAdmin ? '#818cf8' : isAssistant ? '#60a5fa' : '#34d399',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {isAdmin ? <Shield size={10} /> : <UserCircle size={10} />}
                {label}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Team & Permissions</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage who can access and manage your church's financial records.</p>
                </div>
                {isAdminUser && (
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowInviteModal(true)}
                        style={{ gap: '8px' }}
                    >
                        <UserPlus size={18} />
                        Invite Member
                    </button>
                )}
            </header>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <RefreshCw className="spin" size={32} color="var(--primary)" />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Active Members */}
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={18} color="var(--primary-light)" />
                                Active Members
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {profiles.map((profile, i) => (
                                <div 
                                    key={profile.id} 
                                    style={{ 
                                        padding: '1.25rem 1.5rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        borderBottom: i === profiles.length - 1 ? 'none' : '1px solid var(--border)',
                                        background: profile.id === currentUserId ? 'rgba(99, 102, 241, 0.03)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', borderRadius: '12px', 
                                            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 900, color: 'white', fontSize: '1rem'
                                        }}>
                                            {profile.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
                                                {profile.full_name} {profile.id === currentUserId && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>(You)</span>}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        {getRoleBadge(profile.role)}
                                        {profile.id !== currentUserId && isAdminUser && (
                                            <button 
                                                onClick={() => handleRemoveMember(profile.id)}
                                                style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', transition: 'color 0.2s' }}
                                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                                onMouseOut={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(245, 158, 11, 0.03)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                                    <Clock size={18} />
                                    Pending Invitations
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {invites.map((invite, i) => (
                                    <div 
                                        key={invite.id} 
                                        style={{ 
                                            padding: '1.25rem 1.5rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            borderBottom: i === invites.length - 1 ? 'none' : '1px solid var(--border)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ 
                                                width: '40px', height: '40px', borderRadius: '12px', 
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#f59e0b'
                                            }}>
                                                <Mail size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{invite.email}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sent {new Date(invite.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {getRoleBadge(invite.role)}
                                            <button 
                                                onClick={() => copyInviteLink(invite.email, invite.id)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    color: copiedId === invite.id ? '#10b981' : '#6366f1', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {copiedId === invite.id ? <><CheckCircle2 size={12} /> Copied!</> : 'Copy Link'}
                                            </button>
                                            {isAdminUser && (
                                                <button 
                                                    onClick={() => handleCancelInvite(invite.id)}
                                                    disabled={cancellingId === invite.id}
                                                    style={{ 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        color: cancellingId === invite.id ? 'var(--text-muted)' : 'rgba(239, 68, 68, 0.8)', 
                                                        cursor: cancellingId === invite.id ? 'default' : 'pointer', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 800 
                                                    }}
                                                >
                                                    {cancellingId === invite.id ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}
                        onClick={() => !isInviting && setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Invite Team Member</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>They will receive access upon signing up.</p>
                                </div>
                                <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input 
                                            type="email" 
                                            required
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="assistant@church.org"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Role</label>
                                    <select 
                                        value={inviteRole}
                                        onChange={e => setInviteRole(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0f172a', border: '1px solid var(--border)', color: 'white' }}
                                    >
                                        <option value="admin">Main Treasurer (Full Access)</option>
                                        <option value="assistant">Assistant Treasurer</option>
                                        <option value="viewer">Viewer (Read Only)</option>
                                    </select>
                                </div>

                                {inviteError && (
                                    <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                        {inviteError}
                                    </div>
                                )}

                                {inviteSuccess && (
                                    <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.85rem', display: 'flex', gap: '8px' }}>
                                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                                        Invitation sent successfully!
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={isInviting || inviteSuccess}
                                    style={{ width: '100%', padding: '12px' }}
                                >
                                    {isInviting ? <RefreshCw className="spin" size={18} /> : 'Send Invitation'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeamManagement;
