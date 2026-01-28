import { useState, useEffect } from 'react';

export function usePWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (PWA)
    // For iOS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = (window.navigator as any).standalone === true;
    // For Android and desktop
    const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;

    setIsPWA(isStandalone || isDisplayModeStandalone);
  }, []);

  return isPWA;
}
