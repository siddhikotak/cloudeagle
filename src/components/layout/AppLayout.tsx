import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <PageContainer>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            CloudEagle
          </h1>
        </PageContainer>
      </header>
      <main className="flex-1">
        <PageContainer>{children}</PageContainer>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <PageContainer>
          <p className="text-sm text-slate-500">© CloudEagle</p>
        </PageContainer>
      </footer>
    </div>
  );
}
