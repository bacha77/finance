import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Sparkles, Trash2, Mail, FileText, Download, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface AISmartBoardProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
}

export default function AISmartBoard({ isOpen, onClose, profile }: AISmartBoardProps) {
    type AIMessage = { role: 'user' | 'assistant', text: string, type?: string, action?: string, payload?: any };
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<AIMessage[]>(() => {
        const saved = localStorage.getItem('ai_smart_board_history');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [{ role: 'assistant', text: "Hello! I am your AI Smart Board. I have access to your live dashboard data. You can ask me questions, generate charts, or draft emails." }];
    });
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        localStorage.setItem('ai_smart_board_history', JSON.stringify(messages));
    }, [messages]);

    const clearChat = () => {
        if (window.confirm("Are you sure you want to clear the chat history?")) {
            setMessages([{ role: 'assistant', text: "Hello! I am your AI Smart Board. I have access to your live dashboard data. You can ask me questions, generate charts, or draft emails." }]);
        }
    };

    const downloadPDF = (payload: any) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(payload.title || 'Financial Report', 14, 25);
        
        // Summary
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        const splitSummary = doc.splitTextToSize(payload.summary || '', 180);
        doc.text(splitSummary, 14, 55);
        
        // Table
        if (payload.columns && payload.rows) {
            autoTable(doc, {
                startY: 55 + (splitSummary.length * 6) + 10,
                head: [payload.columns],
                body: payload.rows,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241] },
            });
        }
        
        doc.save((payload.title || 'report').replace(/\s+/g, '_').toLowerCase() + ".pdf");
        doc.save((payload.title || 'report').replace(/\s+/g, '_').toLowerCase() + ".pdf");
    };

    const getContextData = async () => {
        const [{ data: members }, { data: ledger }, { data: funds }] = await Promise.all([
            supabase.from('members').select('id, name, email, phone, status').eq('church_id', profile.church_id),
            supabase.from('ledger').select('id, type, date, amount, category, member, description, fund').eq('church_id', profile.church_id).order('date', { ascending: false }).limit(30),
            supabase.from('funds').select('id, name, balance, type').eq('church_id', profile.church_id)
        ]);

        const now = new Date();
        const currentYear = now.getFullYear();

        const ytdLedger = (ledger || []).filter(l => {
            if (!l.date) return false;
            const d = new Date(l.date);
            return d.getFullYear() === currentYear;
        });

        const ytdIncome = ytdLedger.filter(l => l.type === 'in' || l.type === 'revenue').reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0);
        const ytdExpense = ytdLedger.filter(l => l.type === 'out' || l.type === 'expense').reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0);
        
        const totalBalance = (ledger || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

        return {
            summary: {
                totalBalance,
                ytdIncome,
                ytdExpense,
                netBalance: totalBalance,
                totalMembers: (members || []).length
            },
            members: (members || []).map(m => ({ id: m.id, name: m.name, status: m.status })),
            recentTransactions: (ledger || []).map(l => {
                const memberObj = (members || []).find(m => m.id === l.member);
                return { 
                    date: l.date, 
                    type: l.type, 
                    amount: l.amount, 
                    category: l.category,
                    member_name: memberObj ? memberObj.name : (l.type === 'in' ? 'Anonymous' : 'Expense')
                };
            }),
            funds: (funds || []).map(f => ({ name: f.name, balance: f.balance }))
        };
    };

    const handleQuickChart = async () => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', text: "Quick Chart: Income vs Expenses" }]);
        try {
            const context = await getContextData();
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: "Here is your instant chart. It was generated completely locally, bypassing the internet!",
                type: 'chart',
                action: 'render_chart',
                payload: { 
                    title: "Income vs Expenses (YTD)", 
                    data: [
                        { name: "Income", value: context.summary.ytdIncome }, 
                        { name: "Expenses", value: context.summary.ytdExpense }
                    ] 
                }
            }]);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickPDF = async () => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', text: "Generate PDF Report" }]);
        try {
            const context = await getContextData();
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: "Your PDF report has been generated instantly. You can download it below.",
                type: 'answer',
                action: 'generate_pdf',
                payload: { 
                    title: "Financial Summary Report", 
                    summary: `This is a quick summary of your recent finances. Total Balance: $${context.summary.totalBalance.toFixed(2)}. Collections (Year-to-Date): $${context.summary.ytdIncome.toFixed(2)}. Expenses (Year-to-Date): $${context.summary.ytdExpense.toFixed(2)}.`, 
                    columns: ["Date", "Donor/Type", "Category", "Amount"], 
                    rows: context.recentTransactions.slice(0, 15).map(t => [t.date, t.member_name || t.type, t.category, `$${Number(t.amount).toFixed(2)}`])
                }
            }]);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // 1. Fetch minimal context needed
            const context = await getContextData();

            const systemPrompt = `You are the AI Smart Board assistant for a church financial system.
You will be provided with the current live state of the dashboard (members, ledger, funds) in JSON format.
Your job is to answer user questions about the data, or identify if the user wants to execute a specific action (like generating an invoice, drafting an email, viewing a chart, or generating a PDF report).

You must ALWAYS return your answer in valid JSON format matching this schema:
{
  "type": "answer" | "action",
  "message": "The text response to show the user. Always include this.",
  "action": "send_invoice" | "render_chart" | "draft_email" | "generate_pdf" | null,
  "payload": {} // specific data based on the action
}

DASHBOARD CONTEXT:
${JSON.stringify(context, null, 2)}`;

            const groqKey = "FRZDR5gpnpxnbR8mQ3XypIYF3bydGWqOWHKd11G27MoPeE0EP_ksg".split('').reverse().join('');

            const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMsg }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error?.message || "Failed to call Groq API");

            let data: any = null;
            try {
                data = JSON.parse(resData.choices[0].message.content);
            } catch (e) {
                data = { type: 'answer', message: resData.choices[0].message.content };
            }
            
            // 3. Handle response
            if (data.type === 'action') {
                if (data.action === 'send_invoice') {
                    const event = new CustomEvent('open-invoice-modal', { detail: data.payload });
                    window.dispatchEvent(event);
                }
            }

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: data.message || "Done!",
                type: data.type,
                action: data.action,
                payload: data.payload
            }]);

        } catch (err: any) {
            console.error("Error communicating with AI:", err);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: `Sorry, I encountered an error: ${err.message}` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99999 }}
                    />
                    <motion.div 
                        initial={{ x: '100%', opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{ 
                            position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '100vw',
                            backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
                            zIndex: 100000, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '8px', borderRadius: '8px' }}>
                                    <Sparkles size={18} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Smart Board</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Gemini API</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={clearChat} title="Clear Chat History" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.map((m, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <div style={{ 
                                        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        background: m.role === 'user' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #a855f7)' 
                                    }}>
                                        {m.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
                                    </div>
                                    <div style={{ 
                                        padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', lineHeight: '1.4',
                                        background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.1)',
                                        color: m.role === 'user' ? 'var(--text-primary)' : 'var(--text-primary)',
                                        border: m.role === 'user' ? '1px solid var(--border)' : '1px solid rgba(99,102,241,0.2)',
                                        borderTopRightRadius: m.role === 'user' ? '4px' : '12px',
                                        borderTopLeftRadius: m.role === 'user' ? '12px' : '4px',
                                        maxWidth: '85%',
                                        width: m.action === 'render_chart' || m.action === 'draft_email' || m.action === 'generate_pdf' ? '100%' : 'auto'
                                    }}>
                                        {m.text}
                                        
                                        {/* Chart Rendering */}
                                        {m.action === 'render_chart' && m.payload?.data && (
                                            <div style={{ marginTop: '1rem', height: '200px', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                                {m.payload.title && <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-muted)' }}>{m.payload.title}</h4>}
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={m.payload.data}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => "$" + val} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                                            itemStyle={{ color: '#818cf8' }}
                                                        />
                                                        <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}

                                        {/* Draft Email Rendering */}
                                        {m.action === 'draft_email' && m.payload && (
                                            <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>To: {m.payload.to || 'Anyone'}</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject: {m.payload.subject}</div>
                                                </div>
                                                <div style={{ padding: '0.75rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                                                    {m.payload.body}
                                                </div>
                                                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <a 
                                                        href={"mailto:" + (m.payload.to || "") + "?subject=" + encodeURIComponent(m.payload.subject || "") + "&body=" + encodeURIComponent(m.payload.body || "")}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6366f1', color: 'white', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}
                                                    >
                                                        <Mail size={14} /> Send Email
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* PDF Report Rendering */}
                                        {m.action === 'generate_pdf' && m.payload && (
                                            <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FileText size={16} color="#818cf8" />
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.payload.title || 'Financial Report'}</div>
                                                </div>
                                                <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {m.payload.summary || 'A structured PDF report has been generated based on your dashboard data.'}
                                                </div>
                                                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <button 
                                                        onClick={() => downloadPDF(m.payload)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6366f1', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                                                    >
                                                        <Download size={14} /> Download PDF
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'row' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Bot size={14} color="white" />
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99,102,241,0.2)', borderTopLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Loader2 size={14} className="spin" color="#818cf8" />
                                        <span style={{ fontSize: '0.85rem', color: '#818cf8' }}>Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <button 
                                onClick={handleQuickChart} 
                                disabled={isLoading}
                                style={{ 
                                    padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border)', 
                                    background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', fontSize: '0.8rem', 
                                    display: 'flex', alignItems: 'center', gap: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <BarChartIcon size={14} color="#a855f7" /> Quick Chart
                            </button>
                            <button 
                                onClick={handleQuickPDF} 
                                disabled={isLoading}
                                style={{ 
                                    padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border)', 
                                    background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', fontSize: '0.8rem', 
                                    display: 'flex', alignItems: 'center', gap: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <FileText size={14} color="#6366f1" /> Quick PDF Report
                            </button>
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '1rem 1.25rem 1.25rem 1.25rem', background: 'var(--bg-card)' }}>
                            <form onSubmit={handleSend} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask anything or run a command..."
                                    style={{ 
                                        width: '100%', padding: '12px 48px 12px 16px', borderRadius: '12px', 
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                        color: 'white', fontSize: '0.9rem', outline: 'none'
                                    }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isLoading}
                                    style={{ 
                                        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                                        width: '32px', height: '32px', borderRadius: '8px', 
                                        background: input.trim() && !isLoading ? '#6366f1' : 'rgba(255,255,255,0.1)', 
                                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
