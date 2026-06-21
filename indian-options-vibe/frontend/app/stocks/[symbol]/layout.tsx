import { RiskRewardRule } from '@/components/RiskRewardRule';
import { RiskRewardValidator } from '@/components/RiskRewardValidator';
import { StockMiniHistory } from '@/components/StockMiniHistory';
import { StockSetupClassifier } from '@/components/SetupClassifier';

export default function StockSymbolLayout({ children, params }: { children: React.ReactNode; params: { symbol: string } }) {
  const symbol = params.symbol;
  return (
    <>
      {children}
      <StockSetupClassifier symbol={symbol} />
      <RiskRewardRule />
      <RiskRewardValidator symbol={symbol} />
      <StockMiniHistory symbol={symbol} />
    </>
  );
}
