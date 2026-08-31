import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-grid-fade bg-grid">
      <TopBar />
      <div className="mx-auto flex w-full max-w-6xl min-w-0">
        {user && <SideNav />}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>
      {user && <BottomNav />}
    </div>
  );
}
