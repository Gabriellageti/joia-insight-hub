import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase.from("user_preferences").select("sidebar_compact").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setSidebarOpen(!(data?.sidebar_compact ?? false)));
    const handlePreference = (event: Event) => {
      const compact = (event as CustomEvent<{ compact: boolean }>).detail.compact;
      setSidebarOpen(!compact);
    };
    window.addEventListener("joia:sidebar-preference", handlePreference);
    return () => window.removeEventListener("joia:sidebar-preference", handlePreference);
  }, [user]);

  const handleSidebarChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    if (user) {
      void supabase.from("user_preferences").upsert({ user_id: user.id, sidebar_compact: !open, updated_at: new Date().toISOString() });
    }
  }, [user]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarChange}>
      <div className="min-h-dvh flex w-full min-w-0 overflow-x-clip">
        <AppSidebar />
        <div className="min-w-0 flex-1 flex flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-clip p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
