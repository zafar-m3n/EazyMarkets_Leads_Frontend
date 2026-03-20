import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import token from "@/lib/utilities";

const SidebarMenu = ({ menuItems, isExpanded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    token.logout?.();
    navigate("/login");
  };

  return (
    <nav className="mt-2 flex-1 px-2 pb-4 overflow-y-auto">
      {menuItems.map((item, idx) => {
        const isActive = item.path && location.pathname === item.path;

        const baseClasses = "flex items-center w-full rounded-lg transition focus:outline-none focus:ring";
        const expandedClasses = isExpanded
          ? `p-2 mb-1 ${isActive ? "bg-accent text-white font-semibold shadow" : "text-gray-700 hover:bg-accent/10"}`
          : `justify-center p-2 mb-1 ${isActive ? "bg-accent text-white shadow" : "text-gray-700 hover:bg-accent/10"}`;

        // Decide icon color based on state
        const iconColorClass = (() => {
          if (isExpanded && isActive) return "text-white"; // expanded + active
          if (isExpanded) return "text-accent"; // expanded but not active
          return isActive ? "" : "text-accent"; // collapsed active vs inactive
        })();

        if (item.action === "logout") {
          return (
            <button
              key={idx}
              onClick={handleLogout}
              className={`${baseClasses} ${expandedClasses}`}
              aria-label={!isExpanded ? item.label : undefined}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon icon={item.icon} width={20} className={iconColorClass} />
              {isExpanded ? <span className="ml-3">{item.label}</span> : <span className="sr-only">{item.label}</span>}
            </button>
          );
        }

        return (
          <Link
            key={idx}
            to={item.path}
            className={`${baseClasses} ${expandedClasses}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={!isExpanded ? item.label : undefined}
            title={!isExpanded ? item.label : undefined}
          >
            <Icon icon={item.icon} width={20} className={iconColorClass} />
            {isExpanded ? <span className="ml-3">{item.label}</span> : <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
};

export default SidebarMenu;
