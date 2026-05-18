import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;
  }, [location.pathname]);

  return null;
}
