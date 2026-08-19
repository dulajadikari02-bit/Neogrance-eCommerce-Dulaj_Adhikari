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
  // scrolled to on that page. Otherwise (a normal link click), start at the top.
  useEffect(() => {
    if (navigationType === 'POP') {
      const savedY = scrollPositions.get(location.key);
      window.scrollTo(0, savedY ?? 0);
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      scrollPositions.set(location.key, window.scrollY);
    };
  }, [location, navigationType]);

  return null;
}
