import React from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/DefaultLayout";
import token from "@/lib/utilities";
import AccentButton from "@/components/ui/AccentButton";

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    const user = token.getUserData();
    const role = user?.role?.value;

    if (role === "admin") {
      navigate("/admin/dashboard");
    } else if (role === "manager") {
      navigate("/manager/dashboard");
    } else if (role === "sales_rep") {
      navigate("/dashboard");
    } else {
      navigate("/login"); // fallback if not logged in
    }
  };

  return (
    <DefaultLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-6">Oops! The page you are looking for doesn't exist.</p>

        <div className="w-fit">
          <AccentButton text="Go to Dashboard" onClick={handleGoHome} />
        </div>
      </div>
    </DefaultLayout>
  );
};

export default NotFound;
