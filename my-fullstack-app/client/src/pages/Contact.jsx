import React, { useState } from 'react';
import { MapPin, Phone, Mail, Send, CheckCircle } from 'lucide-react';
import api, { errorMessage } from '../lib/api';

const emptyForm = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
      setForm(emptyForm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-10 pb-24 w-full text-white flex flex-col items-center">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <span className="text-white text-xs tracking-[5px] uppercase mb-3 font-light block">
            Get In Touch
          </span>
          <h1 className="font-medium text-3xl md:text-5xl text-white tracking-[6px] uppercase mb-4">
            Contact Us
          </h1>
          <div className="w-16 h-[1px] bg-white/30 mx-auto my-4"></div>
          <p className="text-gray-400 text-xs md:text-sm tracking-wide max-w-md mx-auto">
            Questions about an order, a fragrance, or anything else — send us a message and we'll reply by email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">

          {/* Contact details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <MapPin size={18} className="text-white/40 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Visit</span>
                <span className="text-sm text-gray-300">123 Luxury Avenue, Colombo 03</span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone size={18} className="text-white/40 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Call</span>
                <span className="text-sm text-gray-300">+94 11 234 5678</span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail size={18} className="text-white/40 shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Email</span>
                <span className="text-sm text-gray-300">info@neogrance.com</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="p-8 bg-black border border-gray-900 rounded-xl flex flex-col items-center text-center gap-4">
                <CheckCircle size={32} className="text-white" />
                <h2 className="font-konexy text-sm tracking-[3px] uppercase text-white">Message sent</h2>
                <p className="text-gray-400 text-xs max-w-sm">
                  Thanks for reaching out — we'll get back to you by email soon.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-2 text-[11px] text-white underline underline-offset-4 hover:text-gray-300 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    required
                    type="text"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleField('name')}
                    className="w-full bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Your Email"
                    value={form.email}
                    onChange={handleField('email')}
                    className="w-full bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                <input
                  required
                  type="text"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={handleField('subject')}
                  className="w-full bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
                />
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  placeholder="Your Message"
                  value={form.message}
                  onChange={handleField('message')}
                  className="w-full bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors resize-none"
                />

                {error && <p className="text-[11px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="self-start bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-4 px-8 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={15} />
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
