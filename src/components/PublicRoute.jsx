import React from "react";
import { Navigate } from "react-router-dom";
import token from "@/lib/utilities";

const PublicRoute = ({ children }) => {
  if (token.isAuthenticated()) {
    const user = token.getUserData();

    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default PublicRoute;
