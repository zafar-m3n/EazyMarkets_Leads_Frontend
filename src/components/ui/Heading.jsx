import React from "react";

const Heading = ({ children, className = "", accented = false }) => {
  return (
    <h1 className={`text-2xl font-bold ${className} ${accented ? "text-accent" : "text-gray-800"}`}>{children}</h1>
  );
};

export default Heading;
