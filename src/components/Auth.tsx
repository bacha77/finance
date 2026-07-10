import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthProps {
  onBypass?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onBypass }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isLocal && email === 'admin@bias.com' && password === 'admin') {
        if (onBypass) {
            onBypass();
            setLoading(false);
            return;
        }
    }

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email for the confirmation link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Supabase session automatically updates, App.tsx will catch it and route appropriately.
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />
        
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isSignUp 
              ? 'Enter your details to get started.' 
              : 'Sign in to access your dashboard.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
              <span>{message}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-70"
            >
              {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
              {loading 
                ? (isSignUp ? 'Creating...' : 'Signing In...') 
                : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center relative z-10">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isSignUp 
              ? 'Already have an account? Sign in'
              : 'Don\'t have an account? Sign up'}
          </button>
        </div>

        {isLocal && onBypass && (
          <button
            type="button"
            onClick={onBypass}
            className="mt-6 w-full py-2 border border-emerald-500/30 text-emerald-500 rounded-lg text-xs font-bold hover:bg-emerald-500/10 transition-colors"
          >
            Bypass Login (Dev mode)
          </button>
        )}
      </div>
    </div>
  );
};

export default Auth;
