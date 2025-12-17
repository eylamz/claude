'use client';

import { SessionProvider } from '@/components/providers';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout now uses only the main navigation components
  // (HeaderNav, MobileNav, MobileSidebar) from the root layout
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}

