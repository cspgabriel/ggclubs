import { useEffect } from 'react';

/**
 * Sets the browser tab title as `<page> · GGClubs`.
 *
 * The suffix lives here, not at each call site. It used to be pasted by hand,
 * and three of seven screens forgot it: a tab reading only "Meus clubs" says
 * nothing about which app it belongs to, and a pinned tab is often all the
 * user sees. Callers pass the page name only.
 *
 * Restores the previous title on unmount. `undefined` is a no-op, so callers
 * can await data before naming the page.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · GGClubs`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
