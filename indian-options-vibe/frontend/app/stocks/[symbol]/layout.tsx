import { StockMiniHistory } from '@/components/StockMiniHistory';
import { StockSetupClassifier } from '@/components/SetupClassifier';

export default function StockSymbolLayout({ children, params }: { children: React.ReactNode; params: { symbol: string } }) {
  const symbol = params.symbol;
  return (
    <>
      {children}
      <StockSetupClassifier symbol={symbol} />
      <StockMiniHistory symbol={symbol} />
    </>
  );
}
