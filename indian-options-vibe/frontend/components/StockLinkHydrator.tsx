'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SYMBOLS = new Set([
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK', 'BAJAJ-AUTO',
  'BAJFINANCE', 'BAJAJFINSV', 'BHARTIARTL', 'BPCL', 'BRITANNIA', 'CIPLA',
  'COALINDIA', 'DIVISLAB', 'DRREDDY', 'EICHERMOT', 'GRASIM', 'HCLTECH',
  'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK',
  'INDUSINDBK', 'INFY', 'ITC', 'JSWSTEEL', 'KOTAKBANK', 'LT', 'LTIM', 'M&M',
  'MARUTI', 'NESTLEIND', 'NTPC', 'ONGC', 'POWERGRID', 'RELIANCE', 'SBIN',
  'SHRIRAMFIN', 'SUNPHARMA', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL', 'TCS',
  'TECHM', 'TITAN', 'ULTRACEMCO', 'UPL', 'WIPRO'
]);

function findSymbolNode(target: EventTarget | null): HTMLElement | null {
  let node = target instanceof HTMLElement ? target : null;
  for (let depth = 0; node && depth < 4; depth += 1) {
    const text = (node.textContent || '').trim().toUpperCase();
    if (SYMBOLS.has(text)) return node;
    node = node.parentElement;
  }
  return null;
}

export function StockLinkHydrator() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/stocks') return;

    function onClick(event: MouseEvent) {
      const node = findSymbolNode(event.target);
      if (!node) return;
      const symbol = (node.textContent || '').trim().toUpperCase();
      if (!SYMBOLS.has(symbol)) return;
      event.preventDefault();
      router.push(`/stocks/${encodeURIComponent(symbol)}`);
    }

    function onMouseOver(event: MouseEvent) {
      const node = findSymbolNode(event.target);
      if (!node) return;
      node.style.cursor = 'pointer';
      node.style.textDecoration = 'underline';
      node.style.textUnderlineOffset = '4px';
    }

    function onMouseOut(event: MouseEvent) {
      const node = findSymbolNode(event.target);
      if (!node) return;
      node.style.textDecoration = '';
    }

    document.addEventListener('click', onClick);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [pathname, router]);

  return null;
}
