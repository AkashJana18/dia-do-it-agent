import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "./services/api";
import Overview from "./pages/Overview";
import Assistant from "./pages/Assistant";
import Customers from "./pages/Customers";
import Campaigns from "./pages/Campaigns";
import Offers from "./pages/Offers";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import { LayoutDashboard, MessageSquare, Users, Megaphone, Tag, BarChart3, History, Settings as SettingsIcon } from "lucide-react";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/assistant", label: "Assistant", icon: MessageSquare },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/offers", label: "Offers", icon: Tag },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function Shell({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<any>(null);
  useEffect(() => { api("/api/auth/me").then((d) => setMerchant(d.merchant)).catch(() => {}); }, []);
  return (
    <div className="flex h-full">
      <aside className="hidden md:flex w-56 flex-col bg-surface border-r border-line">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-lg font-bold tracking-tight text-ink">DIA</div>
          <div className="text-[10px] tracking-widest text-neon uppercase mt-0.5">Do-It Agent</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition focus:outline-none focus:ring-1 focus:ring-neon/40 ${isActive ? "bg-neon/10 text-neon border border-neon/30 shadow-[0_0_8px_rgba(34,211,238,0.1)]" : "text-ink-soft hover:text-ink hover:bg-surface-2 border border-transparent"}`
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 text-xs text-ink-dim border-t border-line truncate">
          {merchant ? merchant.name : "Demo merchant"}
        </div>
      </aside>
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-line flex justify-around py-2">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? "text-neon" : "text-ink-dim"}`}>
            <n.icon size={18} />
            {n.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("dia_token")) {
      fetch((import.meta.env.VITE_API_URL || "http://localhost:8787") + "/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => { if (d.token) localStorage.setItem("dia_token", d.token); setReady(true); })
        .catch(() => setReady(true));
    } else setReady(true);
  }, []);
  if (!ready) return <div className="h-full grid place-items-center text-ink-soft text-sm">Loading DIA...</div>;
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
