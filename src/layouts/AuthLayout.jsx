import React from "react";
import logo from "@/assets/logo.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-dm-sans bg-white transition-colors duration-300">
      <div
        className="
          flex items-center justify-center w-full md:w-1/3 py-6 shadow-lg md:shadow-2xl
          bg-gradient-to-br from-white via-accent/30 to-white
        "
      >
        <img src={logo} alt="Logo" className="h-12 md:h-16 object-contain transition-all duration-300" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 text-gray-800">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
