'use client';

import React, { useEffect } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Asidebar from './_components/Asidebar';
import Header from './_components/Header';
import { AuthProvider, useAuthContext } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <Asidebar />
      <SidebarInset>
        <main className="w-full">
          <Header />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

const MainLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <AuthProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AuthProvider>
  );
};

export default MainLayout;
