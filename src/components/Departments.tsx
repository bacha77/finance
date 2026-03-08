import React, { useState, useEffect } from 'react';
import {
    Plus,
    Users,
    MoreVertical,
    Building2,
    BookOpen,
    Edit2,
    Banknote,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Department {
    id: string;
    name: string;
    head: string;
    members: number;
    status: 'Active' | 'Inactive';
    type: 'Ministry' | 'Operations' | 'Education' | 'Offerings' | 'Conference';
    description: string;
}

const DEFAULT_DEPARTMENTS: Department[] = [
    { id: '1', name: 'Tithes & Finance', head: 'Elder Samuel Ade', members: 5, status: 'Active', type: 'Operations', description: 'Oversees church financial records and tithe tracking.' },
    { id: '2', name: 'Building & Facilities', head: 'Bro. David Chen', members: 12, status: 'Active', type: 'Operations', description: 'Maintenance and development of church properties.' },
    { id: '3', name: 'Sabbath School', head: 'Sis. Mary Johnson', members: 45, status: 'Active', type: 'Education', description: 'Morning Bible study and spiritual education.' },
    { id: '4', name: 'Sunday School', head: 'Sis. Elena Smith', members: 30, status: 'Active', type: 'Education', description: 'Children and adults education programs.' },
    { id: '5', name: 'Youth Ministry', head: 'Pastor Tim Rivers', members: 60, status: 'Active', type: 'Ministry', description: 'Engagement and growth for the younger generation.' },
];

const Departments: React.FC = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [departments, setDepartments] = useState<Department[]>(() => {
        const saved = localStorage.getItem('sanctuary_departments');
        return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
    });

    // Supabase Sync
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const { data, error } = await supabase
                    .from('departments')
                    .select('*');

                if (error) throw error;
                if (data && data.length > 0) {
                    setDepartments(data);
                }
            } catch (err) {
                console.error('Error fetching departments from Supabase:', err);
            }
        };

        fetchDepts();
    }, []);

    useEffect(() => {
        localStorage.setItem('sanctuary_departments', JSON.stringify(departments));
    }, [departments]);

    // Form States
    const [newName, setNewName] = useState('');
    const [newHead, setNewHead] = useState('');
    const [newType, setNewType] = useState<'Ministry' | 'Operations' | 'Education' | 'Offerings' | 'Conference'>('Ministry');
    const [newDesc, setNewDesc] = useState('');

    // Edit States
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentEditId, setCurrentEditId] = useState<string | null>(null);

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;

        const newDept: Department = {
            id: (departments.length + 1).toString(),
            name: newName,
            head: newHead,
            members: 0,
            status: 'Active',
            type: newType,
            description: newDesc
        };

        try {
            const { data, error } = await supabase
                .from('departments')
                .insert([newDept])
                .select();

            if (error) throw error;
            if (data) setDepartments([...departments, data[0]]);
        } catch (err) {
            console.error('Error adding department to Supabase:', err);
            setDepartments([...departments, newDept]);
        }

        setShowAddModal(false);
        setNewName('');
        setNewHead('');
        setNewDesc('');
    };

    const handleEditClick = (dept: Department) => {
        setCurrentEditId(dept.id);
        setNewName(dept.name);
        setNewHead(dept.head);
        setNewType(dept.type);
        setNewDesc(dept.description);
        setIsEditMode(true);
        setShowAddModal(true);
    };

    const handleUpdateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !currentEditId) return;

        const updatedDept = {
            name: newName,
            head: newHead,
            type: newType,
            description: newDesc
        };

        try {
            const { error } = await supabase
                .from('departments')
                .update(updatedDept)
                .eq('id', currentEditId);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating department in Supabase:', err);
        }

        setDepartments(departments.map(d =>
            d.id === currentEditId
                ? { ...d, ...updatedDept }
                : d
        ));

        setShowAddModal(false);
        setIsEditMode(false);
        setCurrentEditId(null);
        setNewName('');
        setNewHead('');
        setNewDesc('');
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setIsEditMode(false);
        setCurrentEditId(null);
        setNewName('');
        setNewHead('');
        setNewDesc('');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Operations': return <Building2 size={20} />;
            case 'Education': return <BookOpen size={20} />;
            case 'Offerings': return <Banknote size={20} />;
            case 'Conference': return <Globe size={20} />;
            default: return <Users size={20} />;
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Church Departments</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage and organize the various ministries and operational units.</p>
                </div>
                <button className="btn btn-primary" style={{ gap: '8px' }} onClick={() => setShowAddModal(true)}>
                    <Plus size={18} />
                    Create Department
                </button>
            </header>

            <AnimatePresence>
                {showAddModal && (
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
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 10, opacity: 0 }}
                            style={{
                                width: '100%',
                                maxWidth: '450px',
                                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '2.5rem',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {isEditMode ? 'Edit Department' : 'New Department'}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                                {isEditMode ? 'Update the details for this department.' : 'Initialize a new ministry or functional department.'}
                            </p>

                            <form onSubmit={isEditMode ? handleUpdateDepartment : handleAddDepartment}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>DEPARTMENT NAME</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Media & Tech"
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>DEPARTMENT HEAD <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={newHead}
                                        onChange={(e) => setNewHead(e.target.value)}
                                        placeholder="Enter name"
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>CLASSIFICATION</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as any)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--primary-dark)', border: '1px solid var(--border)', color: 'white' }}
                                    >
                                        <option value="Ministry">Ministry</option>
                                        <option value="Education">Education</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Offerings">Offerings</option>
                                        <option value="Conference">Conference</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>DESCRIPTION</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Brief purpose of the department..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', height: '80px', resize: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn glass" style={{ flex: 1 }} onClick={handleCloseModal}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        {isEditMode ? 'Update' : 'Register'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {departments.map((dept, idx) => (
                    <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="card glass"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary-light)'
                            }}>
                                {getTypeIcon(dept.type)}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleEditClick(dept)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
                                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{dept.name}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{dept.type}</span>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                            {dept.description}
                        </p>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department Head</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{dept.head}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Members / Volunteers</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Users size={14} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{dept.members}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                            <button className="btn glass" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>View Roster</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>Budgeting</button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Departments;
