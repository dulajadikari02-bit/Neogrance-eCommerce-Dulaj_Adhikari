import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const scrollPositions = new Map(); // remembers scroll position for each page we've visited

export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // When the user clicks browser back/forward ("POP"), restore where they were
  // scrolled to on that page. A link carrying a #hash (e.g. footer's "New
  // Arrivals") scrolls to that section instead. Otherwise start at the top.
  useEffect(() => {
    if (navigationType === 'POP') {
      const savedY = scrollPositions.get(location.key);
      window.scrollTo(0, savedY ?? 0);
    } else if (location.hash) {
      const id = location.hash.slice(1);
      // Wait a tick so the target page's content has rendered and the
      // element actually has a position to measure before we scroll to it.
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        // The navbar is fixed on top of the page, so the plain top offset
        // would leave the section's heading tucked underneath it — pull back
        // by the same height main's own top padding reserves for it (see App.jsx).
        const navbarOffset = window.innerWidth >= 768 ? 117 : 73;
        const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      scrollPositions.set(location.key, window.scrollY);
    };
  }, [location, navigationType]);

  return null;
}
