import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useAuthModal } from './AuthModalContext';
import { errorMessage } from '../lib/api';

export default function AuthContext() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, register, loginWithGoogle, forgotPassword } = useAuth();
  const { closeAuth } = useAuthModal();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      closeAuth();
    } catch (err) {
      setError(errorMessage(err, 'Google sign-in failed, please try again.'));
    }
  };

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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotStatus('');
    setForgotSubmitting(true);
    try {
      const message = await forgotPassword(forgotEmail);
      setForgotStatus(message);
    } catch (err) {
      setForgotStatus(errorMessage(err));
    } finally {
      setForgotSubmitting(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="w-full flex flex-col items-center text-center">
        <h1 className="font-konexy text-lg sm:text-xl text-white tracking-[4px] uppercase mb-1">Reset Password</h1>
        <p className="text-gray-400 text-[11px] font-light tracking-wide mb-6">
          Enter your account email and we'll send you a link to reset your password.
        </p>

        <form className="w-full flex flex-col gap-3 mb-4 text-left" onSubmit={handleForgotSubmit}>
          <div className="relative group">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>

          {forgotStatus && (
            <p className="text-[11px] text-gray-300 tracking-wide text-center leading-relaxed">{forgotStatus}</p>
          )}

          <button
            type="submit"
            disabled={forgotSubmitting}
            className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 rounded-lg hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setShowForgotPassword(false); setForgotStatus(''); setForgotEmail(''); }}
          className="text-xs text-gray-500 hover:text-white underline underline-offset-4 decoration-gray-700 hover:decoration-white transition-all"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center text-center">

      {/* Title */}
      <h1 className="font-konexy text-lg sm:text-xl text-white tracking-[4px] uppercase mb-1">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h1>
      <p className="text-gray-400 text-[11px] font-light tracking-wide mb-6">
        {isLogin
          ? 'Sign in to access your minimalist luxury experience.'
          : 'Join us to explore the exclusive minimalist collection.'}
      </p>

      {/* ================= EMAIL FORM ================= */}
      <form className="w-full flex flex-col gap-3 mb-5 text-left" onSubmit={handleSubmit}>

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
            <button
              type="button"
              onClick={() => { setShowForgotPassword(true); setError(''); }}
              className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest cursor-pointer transition-colors"
            >
              Forgot Password?
            </button>
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

      {/* Divider */}
      <div className="w-full flex items-center gap-3 mb-5">
        <div className="h-[1px] flex-1 bg-white/10"></div>
        <span className="text-[9px] text-gray-600 tracking-[3px] uppercase">Or continue with</span>
        <div className="h-[1px] flex-1 bg-white/10"></div>
      </div>

      {/* Google's own widget (styled to match the dark theme as closely as
          their API allows) since it has to run Google's sign-in flow itself,
          unlike the plain-CSS button used for the main action above. */}
      <div className="w-full flex justify-center mb-2 [&>div]:w-full">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-in failed, please try again.')}
          theme="filled_black"
          shape="pill"
          size="large"
          text={isLogin ? 'signin_with' : 'signup_with'}
          width="320"
        />
      </div>

      {/* Toggle Login/Signup */}
      <div className="text-xs text-gray-500 tracking-wide font-light mt-3">
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
