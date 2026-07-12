import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Ticket, Users, Calendar, MapPin, DollarSign } from 'lucide-react';

interface Event {
    id: string;
    name: string;
    description: string;
    date: string;
    location: string;
    price: number;
    capacity: number;
}

interface TicketInfo {
    id: string;
    event_id: string;
    purchaser_name: string;
    quantity: number;
    amount_paid: number;
    status: string;
}

export default function Events({ churchId, userRole, userName, userEmail }: { churchId: string, userRole: string, userName: string, userEmail: string }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [tickets, setTickets] = useState<TicketInfo[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState<Event | null>(null);
    
    // Create Event Form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState(0);
    const [capacity, setCapacity] = useState(100);

    // Buy Ticket Form
    const [quantity, setQuantity] = useState(1);

    const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('pastor');

    useEffect(() => {
        fetchEvents();
        if (isAdmin) fetchTickets();
    }, [churchId, isAdmin]);

    async function fetchEvents() {
        const { data } = await supabase.from('events').select('*').eq('church_id', churchId).order('date', { ascending: true });
        if (data) setEvents(data);
    }

    async function fetchTickets() {
        const { data } = await supabase.from('tickets').select('*').eq('church_id', churchId);
        if (data) setTickets(data);
    }

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        await supabase.from('events').insert({
            church_id: churchId,
            name, description, date, location, price, capacity
        });
        setShowCreateModal(false);
        setName(''); setDescription(''); setDate(''); setLocation(''); setPrice(0); setCapacity(100);
        fetchEvents();
    };

    const handleBuyTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showBuyModal) return;
        
        const totalPaid = showBuyModal.price * quantity;
        
        await supabase.from('tickets').insert({
            church_id: churchId,
            event_id: showBuyModal.id,
            purchaser_name: userName,
            purchaser_email: userEmail,
            quantity,
            amount_paid: totalPaid,
            status: 'paid'
        });

        if (totalPaid > 0) {
            await supabase.from('ledger').insert({
                church_id: churchId,
                amount: totalPaid,
                type: 'in',
                category: 'Events',
                member: userName,
                desc: `Tickets for ${showBuyModal.name}`,
                date: new Date().toISOString().split('T')[0]
            });
        }

        setShowBuyModal(null);
        setQuantity(1);
        if (isAdmin) fetchTickets();
    };

    const getTicketsSold = (eventId: string) => {
        return tickets.filter(t => t.event_id === eventId).reduce((sum, t) => sum + t.quantity, 0);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Events & Ticketing</h1>
                {isAdmin && <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}><Plus /> Create Event</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {events.map(event => (
                    <div key={event.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{event.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', flex: 1 }}>{event.description}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {new Date(event.date).toLocaleDateString()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {event.location}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={14} /> {event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}</div>
                            {isAdmin && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}><Users size={14} /> {getTicketsSold(event.id)} / {event.capacity} Sold</div>}
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowBuyModal(event)}>
                            <Ticket size={16} /> Get Tickets
                        </button>
                    </div>
                ))}
            </div>

            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h2>Create Event</h2>
                        <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <input type="text" placeholder="Event Name" required value={name} onChange={e => setName(e.target.value)} className="input-field" style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <textarea placeholder="Description" required value={description} onChange={e => setDescription(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', minHeight: '80px' }} />
                            <input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <input type="text" placeholder="Location" required value={location} onChange={e => setLocation(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input type="number" step="0.01" placeholder="Price (0 for free)" required value={price} onChange={e => setPrice(parseFloat(e.target.value))} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                                <input type="number" placeholder="Capacity" required value={capacity} onChange={e => setCapacity(parseInt(e.target.value))} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBuyModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h2>Get Tickets for {showBuyModal.name}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{showBuyModal.price === 0 ? 'Free Admission' : `$${showBuyModal.price.toFixed(2)} per ticket`}</p>
                        <form onSubmit={handleBuyTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Quantity</label>
                                <input type="number" min="1" max="10" required value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)' }} />
                            </div>
                            {showBuyModal.price > 0 && (
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'right', marginTop: '1rem' }}>
                                    Total: ${(showBuyModal.price * quantity).toFixed(2)}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowBuyModal(null)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{showBuyModal.price > 0 ? 'Pay Now' : 'Reserve'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
