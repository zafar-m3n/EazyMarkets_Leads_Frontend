import React from "react";

const GrayButton = ({
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  spinner = null,
  text = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full bg-gray-200 text-gray-800 px-4 py-2 rounded font-medium transition ${
        disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"
      } ${className}`}
    >
      {loading ? spinner : text}
    </button>
  );
};

export default GrayButton;
