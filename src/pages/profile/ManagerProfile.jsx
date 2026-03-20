import React, { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";
import TextInput from "@/components/form/TextInput";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

const schema = Yup.object({
  current_password: Yup.string().required("Current password is required"),
  new_password: Yup.string().required("New password is required").min(8, "New password must be at least 8 characters"),
  confirm_new_password: Yup.string()
    .oneOf([Yup.ref("new_password")], "Passwords do not match")
    .required("Please confirm your new password"),
});

const initialsFromName = (fullName = "") => {
  try {
    const parts = String(fullName).trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + last).toUpperCase() || "U";
  } catch {
    return "U";
  }
};

const FieldRow = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 py-2">
    {icon && <Icon icon={icon} width={20} className="mt-0.5 text-gray-500" />}
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-gray-800 truncate">{value ?? "-"}</div>
    </div>
  </div>
);

const ManagerProfile = () => {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState(null);
  const [notif, setNotif] = useState({ type: null, message: null });
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_new_password: "",
    },
  });

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await API.private.getProfile();
        if (!mounted) return;
        setProfile(res?.data?.data || null);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setNotif({
          type: "error",
          message: err?.response?.data?.error || "Unable to load profile. Please try again.",
        });
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (values) => {
    try {
      setSaving(true);
      await API.private.updatePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      setNotif({ type: "success", message: "Password updated successfully." });
      reset();
    } catch (err) {
      console.error("Update password error:", err);
      setNotif({
        type: "error",
        message:
          err?.response?.data?.error || "Failed to update password. Please check your current password and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const nameInitials = useMemo(() => initialsFromName(profile?.full_name), [profile?.full_name]);

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Manager Profile</h1>
        </div>

        {notif.message && (
          <Notification
            type={notif.type === "error" ? "danger" : "success"}
            onClose={() => setNotif({ type: null, message: null })}
          >
            {notif.message}
          </Notification>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              {loadingProfile ? (
                <div className="animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-gray-200 mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="h-4 bg-gray-200 rounded w-4/6" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center justify-center text-xl font-semibold">
                      {nameInitials}
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-gray-800">{profile?.full_name || "-"}</div>
                      <div className="inline-flex items-center gap-2 mt-1">
                        <Badge text={profile?.role?.label || "—"} color="blue" size="sm" />
                        <Badge
                          text={profile?.is_active ? "Active" : "Inactive"}
                          color={profile?.is_active ? "green" : "red"}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 divide-y divide-gray-100">
                    <FieldRow label="Email" value={profile?.email} icon="mdi:email-outline" />
                    <FieldRow
                      label="Phone"
                      value={profile?.phone && profile?.phone.length > 4 ? profile?.phone : "N/A"}
                      icon="mdi:phone-outline"
                    />
                    <FieldRow label="User ID" value={profile?.id} icon="mdi:identifier" />
                    <FieldRow
                      label="Status"
                      value={profile?.is_active ? "Active" : "Inactive"}
                      icon="mdi:account-check-outline"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
              <p className="text-gray-600 text-sm mt-1">Set a strong password (min 8 characters).</p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <TextInput
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                  error={errors.current_password?.message}
                  {...register("current_password")}
                />
                <TextInput
                  label="New Password"
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  error={errors.new_password?.message}
                  {...register("new_password")}
                />
                <TextInput
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter new password"
                  error={errors.confirm_new_password?.message}
                  {...register("confirm_new_password")}
                />

                <div className="flex justify-end items-center gap-3 pt-2">
                  <GrayButton type="button" text="Reset" onClick={() => reset()} disabled={saving || !isDirty} />
                  <AccentButton
                    type="submit"
                    text={saving ? "Saving..." : "Update Password"}
                    loading={saving}
                    disabled={saving}
                  />
                </div>
              </form>

              <div className="mt-6 text-xs text-gray-600 space-y-1">
                <div className="flex items-start gap-2">
                  <Icon icon="mdi:shield-key" width={16} className="mt-0.5" />
                  <span>Use a mix of letters, numbers, and symbols for best security.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Icon icon="mdi:alert-circle-outline" width={16} className="mt-0.5" />
                  <span>You’ll need your current password to confirm this change.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ManagerProfile;
