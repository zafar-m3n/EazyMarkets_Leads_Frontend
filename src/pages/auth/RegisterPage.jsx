import React, { useState } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Spinner from "@/components/ui/Spinner";
import { useNavigate } from "react-router-dom";

import TextInput from "@/components/form/TextInput";
import PhoneInput from "@/components/form/PhoneInput";
import Select from "@/components/form/Select";
import AccentButton from "@/components/ui/AccentButton";
import Heading from "@/components/ui/Heading";

// ==========================
// Validation Schema
// ==========================
const schema = Yup.object().shape({
  full_name: Yup.string().required("Full name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(6, "Minimum 6 characters").required("Password is required"),
  role_id: Yup.string().required("Role is required"),
});

// ==========================
// Static Roles
// ==========================
const ROLE_OPTIONS = [
  { value: "1", label: "Admin" },
  { value: "2", label: "Manager" },
  { value: "3", label: "Sales Rep" },
];

const RegisterPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const payload = {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role_id: data.role_id,
        phone: data.phone || null,
      };

      const res = await API.private.registerUser(payload);

      if (res.data.code === "OK") {
        Notification.success(res.data.data?.message || "Registration successful!");
        reset();
        navigate("/login"); // ✅ redirect to login
      } else {
        Notification.error(res.data.error || "Unexpected response from server.");
      }
    } catch (error) {
      const status = error.response?.status;
      let msg = "Something went wrong during registration.";
      if (status === 400) msg = error.response?.data?.error || "Email already registered.";
      else if (status === 500) msg = "Server error. Please try again later.";
      Notification.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white shadow-2xl rounded-lg p-6 w-full max-w-md mx-auto border border-gray-100 transition-all duration-300">
        <Heading className="text-center">
          Create Your <span className="text-accent">LeadHive</span> Account
        </Heading>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <TextInput placeholder="Enter Your Full Name" {...register("full_name")} error={errors.full_name?.message} />
          <TextInput type="email" placeholder="Enter Your Email" {...register("email")} error={errors.email?.message} />
          <TextInput
            type="password"
            placeholder="Password"
            {...register("password")}
            error={errors.password?.message}
          />

          <PhoneInput
            label="Phone (Optional)"
            value={watch("phone") || ""}
            onChange={(val) => setValue("phone", val)}
            error={errors.phone?.message}
          />

          <Select
            label="Select Role"
            options={ROLE_OPTIONS}
            value={watch("role_id") || ""}
            onChange={(val) => setValue("role_id", val)}
            error={errors.role_id?.message}
          />

          <AccentButton type="submit" loading={isSubmitting} text="Register" spinner={<Spinner color="white" />} />

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-accent font-medium">
              Login
            </a>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
