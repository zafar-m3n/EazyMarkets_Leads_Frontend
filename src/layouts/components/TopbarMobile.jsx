import React from "react";
import Icon from "@/components/ui/Icon";
import logo from "@/assets/logo.png";

const TopbarMobile = ({ setMenuOpen }) => {
  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-white shadow fixed top-0 left-0 right-0 z-30">
      {/* Brand logo (always full logo on mobile) */}
      <img src={logo} alt="LeadHive Logo" className="h-8 w-auto" />

      {/* Menu button */}
      <button
        onClick={() => setMenuOpen(true)}
        className="rounded p-2 hover:bg-gray-100 focus:outline-none focus:ring"
        aria-label="Open sidebar menu"
      >
        <Icon icon="mdi:menu" width={26} className="text-accent" />
      </button>
    </div>
  );
};

export default TopbarMobile;
