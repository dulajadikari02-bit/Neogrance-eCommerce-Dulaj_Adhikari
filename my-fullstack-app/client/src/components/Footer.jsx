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
          <div className="flex items-center space-x-6">
            <a
              href="https://www.instagram.com/neogrance?igsi=MjR6OXdwaW81Yngw"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Neogrance on Instagram"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
              </svg>
            </a>
            <a href="#" aria-label="Neogrance on Facebook" className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a
              href={`https://wa.me/94761607224?text=${encodeURIComponent("Hi! I'd like to ask about a Neogrance product.")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Neogrance on WhatsApp"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0011.99 0C5.446 0 .132 5.313.13 11.86c0 2.09.546 4.13 1.582 5.93L.057 24l6.335-1.66a11.882 11.882 0 005.596 1.427h.005c6.543 0 11.858-5.313 11.86-11.86a11.788 11.788 0 00-3.48-8.363" />
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
                <span>Kuliyapitiya</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-white/40 shrink-0" />
                <span>+94 74 218 1258</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-white/40 shrink-0" />
                <span>neo@neogrance.com</span>
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