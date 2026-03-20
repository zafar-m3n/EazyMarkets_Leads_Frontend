import React from "react";

const AccentButton = ({
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
      className={`w-full bg-accent text-white px-4 py-2 rounded font-semibold transition ${
        disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/90"
      } flex justify-center items-center gap-2 ${className}`}
    >
      {loading ? spinner : text}
    </button>
  );
};

export default AccentButton;
