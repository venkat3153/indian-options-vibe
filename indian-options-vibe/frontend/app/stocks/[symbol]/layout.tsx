import { StockMiniHistory } from '@/components/StockMiniHistory';

export default function StockSymbolLayout({ children, params }: { children: React.ReactNode; params: { symbol: string } }) {
  return (
    <>
      {children}
      <StockMiniHistory symbol={params.symbol} />
    </>
  );
}
