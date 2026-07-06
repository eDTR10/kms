import { useEffect, useState } from "react";

/**
 * False for the first render, true one tick later. Gate a bar/slice's target
 * width or scale on this so it animates in from zero via a CSS transition
 * instead of appearing at full size on mount.
 */
export function useMountedIn(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}
