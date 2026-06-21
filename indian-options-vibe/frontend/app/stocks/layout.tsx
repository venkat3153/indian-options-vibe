import { StockLinkHydrator } from '@/components/StockLinkHydrator';

export default function StocksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StockLinkHydrator />
      {children}
    </>
  );
}
