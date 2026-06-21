import { MainBreadthSummary } from '@/components/MainBreadthSummary';
import { StockLinkHydrator } from '@/components/StockLinkHydrator';
import { SetupClassifierPanel } from '@/components/SetupClassifier';

export default function StocksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StockLinkHydrator />
      <MainBreadthSummary />
      {children}
      <SetupClassifierPanel />
    </>
  );
}
