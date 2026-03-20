import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopbarDesktop from "./components/TopbarDesktop";
import TopbarMobile from "./components/TopbarMobile";

const DefaultLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  useLocation(); // keep route awareness for topbars if needed

  const desktopPadding = sidebarExpanded ? "md:pl-64" : "md:pl-16";

  return (
    <div className="flex h-screen bg-white font-dm-sans overflow-hidden relative">
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onExpandChange={setSidebarExpanded} />

      {/* Mobile backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      {/* Main content; padding-left shifts with sidebar width on desktop */}
      <div className={`flex-1 flex flex-col h-full ${desktopPadding} transition-[padding] duration-300`}>
        <TopbarDesktop />
        <TopbarMobile setMenuOpen={setMenuOpen} />
        <main className="mt-10 px-4 md:px-6 overflow-y-auto flex-1 py-10 text-black app-scrollbar">{children}</main>
      </div>
    </div>
  );
};

export default DefaultLayout;
