import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardProps {
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: LucideIcon;
    color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, change, trend, icon: Icon, color }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="glass-card"
            style={{
                padding: '2rem',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
                pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color
                }}>
                    <Icon size={24} />
                </div>
                <div style={{
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: trend === 'up' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: trend === 'up' ? '#22c55e' : '#ef4444',
                    height: 'fit-content'
                }}>
                    {change}
                </div>
            </div>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                    {value}
                </h3>
            </div>
        </motion.div>
    );
};

export default StatsCard;
