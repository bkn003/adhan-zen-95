import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shows `initial` items, then reveals `step` more each time the sentinel
 * scrolls into view. Keeps the first paint light on big mosque lists.
 */
export function useInfiniteReveal(total: number, initial = 15, step = 15, resetKey?: unknown) {
  const [count, setCount] = useState(initial);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => { setCount(initial); }, [resetKey, initial]);

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setCount((c) => Math.min(c + step, total));
    }, { rootMargin: '200px' });
    observerRef.current.observe(node);
  }, [step, total]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { count, hasMore: total > count, sentinelRef };
}
