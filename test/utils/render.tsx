import { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';

function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function render(ui: ReactElement, options?: Parameters<typeof rtlRender>[1]) {
  return rtlRender(ui, { wrapper: Providers as any, ...options });
}

export * from '@testing-library/react';



