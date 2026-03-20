import React, { useState, useCallback } from "react";
import SidebarMenu from "./SidebarMenu";
import logo from "@/assets/logo.png";
import favicon from "@/assets/favicon.png";
import token from "@/lib/utilities";
import useWidth from "@/hooks/useWidth";

const Sidebar = ({ menuOpen, setMenuOpen, onExpandChange }) => {
  const { width, breakpoints } = useWidth();
  const isDesktop = width >= breakpoints.md;

  const user = token.getUserData?.() || {};
  const role = user?.role?.value || "guest";

  const [isHoverExpanded, setIsHoverExpanded] = useState(false);

  const openExpanded = useCallback(() => {
    if (!isDesktop) return;
    setIsHoverExpanded(true);
    onExpandChange?.(true);
  }, [isDesktop, onExpandChange]);

  const closeExpanded = useCallback(() => {
    if (!isDesktop) return;
    setIsHoverExpanded(false);
    onExpandChange?.(false);
  }, [isDesktop, onExpandChange]);

  const adminItems = [
    { label: "Dashboard", icon: "mdi:view-dashboard-outline", path: "/admin/dashboard" },
    { label: "Manage Users", icon: "mdi:account-multiple-outline", path: "/admin/users" },
    { label: "Teams", icon: "mdi:users", path: "/admin/teams" },
    { label: "Leads", icon: "mdi:account-tie-outline", path: "/admin/leads" },
    { label: "Leads Export", icon: "mdi:export", path: "/admin/leads/export" },
    { label: "Reports", icon: "mdi:chart-bar", path: "/admin/reports" },
    { label: "Settings", icon: "mdi:cog-outline", path: "/admin/settings" },
    { label: "Logout", icon: "mdi:logout", action: "logout" },
  ];
  const managerItems = [
    { label: "Dashboard", icon: "mdi:view-dashboard-outline", path: "/manager/dashboard" },
    { label: "Team Leads", icon: "mdi:account-group-outline", path: "/manager/leads" },
    // { label: "Reports", icon: "mdi:chart-bar", path: "/manager/reports" },
    { label: "My Team", icon: "mdi:users", path: "/manager/team" },
    { label: "Profile", icon: "mdi:account-circle-outline", path: "/manager/profile" },
    { label: "Logout", icon: "mdi:logout", action: "logout" },
  ];
  const salesRepItems = [
    { label: "Dashboard", icon: "mdi:view-dashboard-outline", path: "/dashboard" },
    { label: "My Leads", icon: "mdi:account-tie-outline", path: "/leads" },
    { label: "Profile", icon: "mdi:account-circle-outline", path: "/profile" },
    { label: "Logout", icon: "mdi:logout", action: "logout" },
  ];

  let menuItems = [];
  if (role === "admin") menuItems = adminItems;
  else if (role === "manager") menuItems = managerItems;
  else if (role === "sales_rep") menuItems = salesRepItems;
  else menuItems = [{ label: "Logout", icon: "mdi:logout", action: "logout" }];

  return (
    <>
      {/* Desktop: single fixed sidebar that expands its width on hover */}
      <div
        className={`
          hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-50
          bg-white shadow-xl border-r h-full
          ${isHoverExpanded ? "w-64" : "w-16"}
          transition-[width] duration-300 ease-in-out
          flex-col
        `}
        onMouseEnter={openExpanded}
        onMouseLeave={closeExpanded}
        onFocusCapture={openExpanded}
        onBlurCapture={closeExpanded}
        aria-label="Primary navigation"
      >
        <div className="shadow p-4 flex items-center">
          {isHoverExpanded ? (
            <img src={logo} alt="LeadHive Logo" className="h-8 w-auto object-contain" />
          ) : (
            <img src={favicon} alt="LeadHive" className="h-8 w-8 object-contain" />
          )}
        </div>

        <SidebarMenu menuItems={menuItems} isExpanded={isHoverExpanded} />
      </div>

      {/* Mobile drawer remains the same */}
      <div
        className={`
          md:hidden fixed top-0 bottom-0 left-0 z-50 w-64 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-64"}
        `}
        aria-hidden={!menuOpen}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LeadHive Logo" className="h-8 w-auto object-contain" />
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="rounded p-2 hover:bg-gray-100 focus:outline-none focus:ring"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <SidebarMenu menuItems={menuItems} isExpanded />
      </div>
    </>
  );
};

export default Sidebar;
