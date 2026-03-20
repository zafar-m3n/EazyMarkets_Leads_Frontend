import React from "react";
import Icon from "@/components/ui/Icon";

const TopbarDesktop = () => {
  return (
    <div className="hidden md:flex justify-end items-center bg-white shadow px-6 fixed top-0 right-0 left-16 z-30 h-16">
      <Icon icon="mdi:account-circle" width={34} className="cursor-pointer text-gray-600 ml-4" />
      <div className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full ml-4 shadow">ENG</div>
    </div>
  );
};

export default TopbarDesktop;
