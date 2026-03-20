import React from "react";

const Spinner = ({ color = "accent", message }) => {
  const borderColor = color === "white" ? "border-white" : "border-accent";

  return (
    <div className="flex justify-center items-center flex-col space-y-4">
      <div className={`w-8 h-8 border-4 border-t-transparent ${borderColor} rounded-full animate-spin`}></div>
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  );
};

export default Spinner;
