import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useAuthModal } from '../context/AuthModalContext';
import { errorMessage } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { openAuth } = useAuthModal();

  // Coming in from the email link, the browser's back button shouldn't take
  // the user anywhere from here — re-push this URL every time they try.
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const trapBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', trapBack);
    return () => window.removeEventListener('popstate', trapBack);
  }, []);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email, token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password. The link may have expired.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen pt-24 pb-24 w-full text-white flex flex-col items-center justify-center text-center px-4">
        <p className="text-gray-400 text-sm mb-6">This password reset link is invalid.</p>
        <Link to="/" className="text-white underline underline-offset-4 text-sm">Back to Home</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen pt-24 pb-24 w-full text-white flex flex-col items-center justify-center text-center px-4">
        <CheckCircle size={48} className="text-white mb-6" />
        <h1 className="font-konexy text-2xl tracking-[4px] uppercase mb-3">Password Reset</h1>
        <p className="text-gray-400 text-sm mb-10">You can now sign in with your new password.</p>
        <button
          onClick={() => { navigate('/', { replace: true }); openAuth(); }}
          className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3.5 px-10 rounded-lg hover:bg-gray-200 transition-all"
        >
          Log In Now
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-24 w-full text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h1 className="font-konexy text-xl text-white tracking-[4px] uppercase mb-1">Reset Password</h1>
        <p className="text-gray-400 text-[11px] font-light tracking-wide mb-8">
          Choose a new password for {email}.
        </p>

        <form className="w-full flex flex-col gap-3 text-left" onSubmit={handleSubmit}>
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
            <input
              type="password"
              placeholder="NEW PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[#111] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
            <input
              type="password"
              placeholder="CONFIRM NEW PASSWORD"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[#111] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-xs tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>

          {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3.5 rounded-lg hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 mt-2 disabled:opacity-50"
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
