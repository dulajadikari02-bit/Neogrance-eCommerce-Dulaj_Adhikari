import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import logo from '../assets/logo23.png';
import api, { errorMessage } from '../lib/api';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Send the entered email to the server to sign up for the newsletter.
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setStatus('');
    try {
      const { data } = await api.post('/newsletter/subscribe', { email });
      setStatus(data.message);
      setEmail('');
    } catch (err) {
      setStatus(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer 
      className="relative text-gray-300 border- border-white/10 pt-16 pb-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/download.jpg')" }}
    >
      {/* Dark overlay so the text stays readable over the background image */}
      <div className="absolute inset-0 bg-black/85"></div>

      {/* relative z-10 lifts the text above the background overlay */}
      <div className="relative z-10 w-full px-4 md:px-8 xl:px-16 2xl:px-24">
        
        {/* Top Section: Centered Logo, Description & Socials */}
        <div className="flex flex-col items-center text-center mb-16">
          <img src={logo} alt="Neogrance Logo" className="h-18 mb-6 object-contain" />
          <p className="text-sm text-gray-400 font-light leading-relaxed max-w-lg mb-8">
            Experience the art of luxury fragrance. Curated scents for the modern individual who appreciates elegance and distinction.
          </p>
          
          {/* Social Icons */}
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* Middle Section: Links & Contact (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-15 lg:gap-15 mb-16 text-center md:text-left">
          
          {/* Column 1: Collections */}
          <div className="flex flex-col md:items-start items-center">
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-6 font-konexy">
              Collections
            </h4>
            <ul className="space-y-4 text-sm font-light">
              <li>
                <Link to="/mens" className="hover:text-white transition-colors">Men's Fragrances</Link>
              </li>
              <li>
                <Link to="/womens" className="hover:text-white transition-colors">Women's Fragrances</Link>
              </li>
              <li>
                <Link to="/unisex" className="hover:text-white transition-colors">Unisex Collection</Link>
              </li>
              <li>
                <a href="#new" className="hover:text-white transition-colors">New Arrivals</a>
              </li>
            </ul>
          </div>

          {/* Column 2: Customer Care */}
          <div className="flex flex-col md:items-start items-center">
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-6 font-konexy">
              Customer Care
            </h4>
            <ul className="space-y-4 text-sm font-light">
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
              </li>
              <li>
                <a href="#shipping" className="hover:text-white transition-colors">Shipping & Returns</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">Track Your Order</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & Newsletter */}
          <div className="flex flex-col md:items-start items-center">
            <h4 className="text-white text-xs tracking-[0.2em] uppercase font-bold mb-6 font-konexy">
              Contact Us
            </h4>
            <ul className="space-y-4 text-sm font-light mb-6 flex flex-col md:items-start items-center">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-white/40 shrink-0 mt-0.5" />
                <span>123 Luxury Avenue, Colombo 03</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-white/40 shrink-0" />
                <span>+94 11 234 5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-white/40 shrink-0" />
                <span>info@neogrance.com</span>
              </li>
            </ul>

            {/* Newsletter Input */}
            <div className="mt-2 w-full max-w-[250px]">
              <form onSubmit={handleSubscribe} className="flex border-b border-gray-600 focus-within:border-white transition-colors pb-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent w-full text-sm outline-none placeholder:text-gray-500 text-white text-center md:text-left"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-[10px] tracking-widest uppercase font-bold hover:text-white transition-colors cursor-pointer ml-2 disabled:opacity-50"
                >
                  {submitting ? '...' : 'Subscribe'}
                </button>
              </form>
              {status && <p className="text-[10px] text-gray-500 mt-2 text-center md:text-left">{status}</p>}
            </div>
          </div>

        </div>

        {/* Bottom Footer / Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 tracking-wider text-center md:text-left">
            &copy; {new Date().getFullYear()} NEOGRANCE. All rights reserved.
          </p>
          <div className="flex space-x-6 text-xs text-gray-500 tracking-wider">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  );
}