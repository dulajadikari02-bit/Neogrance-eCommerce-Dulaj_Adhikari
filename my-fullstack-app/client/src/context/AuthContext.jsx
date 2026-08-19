import React, { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useAuthModal } from './AuthModalContext';
import { errorMessage } from '../lib/api';

export default function AuthContext() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const { closeAuth } = useAuthModal();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Depending on which tab is active, either log the user in or sign them up.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      closeAuth();
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong, please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center text-center">

      {/* Title */}
      <h1 className="font-konexy text-lg sm:text-xl text-white tracking-[4px] uppercase mb-1">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h1>
      <p className="text-gray-400 text-[11px] font-light tracking-wide mb-4">
        {isLogin
          ? 'Sign in to access your minimalist luxury experience.'
          : 'Join us to explore the exclusive minimalist collection.'}
      </p>

      {/* ================= SOCIAL LOGINS (SSO) ================= */}
      <div className="w-full flex flex-col gap-2 mb-4">

        {/* Google Button */}
        <button type="button" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-[#111] border border-white/10 hover:border-white/40 hover:bg-black transition-all duration-300 group">
          <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Standard Google "G" logo icon, one color to match the dark theme */}
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="currentColor" className="text-white"/>
          </svg>
          <span className="text-[11px] text-gray-300 font-medium tracking-widest uppercase group-hover:text-white transition-colors">
            Continue with Google
          </span>
        </button>

        {/* Apple Button */}
        <button type="button" className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-[#111] border border-white/10 hover:border-white/40 hover:bg-black transition-all duration-300 group">
          <svg className="w-4 h-4 fill-current text-white opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.365 7.043c-.87-.042-1.895.537-2.483 1.258-.528.647-.952 1.583-.787 2.477.962.062 1.906-.52 2.463-1.208.572-.716 1.026-1.685.807-2.527zm1.196 3.52c-1.393-.058-2.613.84-3.255.84-.64 0-1.637-.768-2.775-.75-1.463.023-2.82.85-3.57 2.16-1.523 2.656-.39 6.58 1.106 8.742.723 1.045 1.573 2.203 2.705 2.164 1.096-.04 1.516-.704 2.824-.704 1.306 0 1.687.704 2.824.685 1.173-.02 1.916-1.07 2.637-2.126.83-1.22 1.17-2.4 1.19-2.46-.027-.01-2.316-.888-2.34-3.555-.02-2.23 1.82-3.3 1.905-3.355-1.04-1.514-2.666-1.716-3.25-1.76l-.001-.001z"/>
          </svg>
          <span className="text-[11px] text-gray-300 font-medium tracking-widest uppercase group-hover:text-white transition-colors">
            Continue with Apple
          </span>
        </button>

      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 mb-4">
        <div className="h-[1px] flex-1 bg-white/10"></div>
        <span className="text-[9px] text-gray-600 tracking-[3px] uppercase">Or with email</span>
        <div className="h-[1px] flex-1 bg-white/10"></div>
      </div>

      {/* ================= EMAIL FORM ================= */}
      <form className="w-full flex flex-col gap-3 mb-4 text-left" onSubmit={handleSubmit}>

        {!isLogin && (
          <div className="relative group">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="FULL NAME"
              value={form.name}
              onChange={handleChange('name')}
              required
              className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
        )}

        <div className="relative group">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            value={form.email}
            onChange={handleChange('email')}
            required
            className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
          />
        </div>

        <div className="relative group">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
          <input
            type="password"
            placeholder="PASSWORD"
            value={form.password}
            onChange={handleChange('password')}
            required
            minLength={8}
            className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
          />
        </div>

        {isLogin && (
          <div className="flex justify-end">
            <span className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest cursor-pointer transition-colors">
              Forgot Password?
            </span>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-red-400 tracking-wide text-center">{error}</p>
        )}

        {/* Main Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 rounded-lg hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {/* Toggle Login/Signup */}
      <div className="text-xs text-gray-500 tracking-wide font-light">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-white hover:text-gray-300 underline underline-offset-4 decoration-gray-700 hover:decoration-white transition-all"
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </div>

    </div>
  );
}
