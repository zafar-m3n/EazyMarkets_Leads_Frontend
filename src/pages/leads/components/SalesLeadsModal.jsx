import React, { useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/form/Select";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";
import Badge from "@/components/ui/Badge";
import { getSourceColor } from "@/utils/leadColors";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

const schema = Yup.object().shape({
  status_id: Yup.string().required("Status is required"),
});

const KV = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-medium text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value ?? "-"}</span>
  </div>
);

const SalesLeadsModal = ({ isOpen, onClose, onSubmit, editingLead, statuses, loading }) => {
  const defaultValues = useMemo(
    () => ({
      status_id: editingLead?.status_id || editingLead?.LeadStatus?.id || "",
    }),
    [editingLead],
  );

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const submitHandler = (data) => {
    onSubmit({
      status_id: data.status_id,
    });
  };

  const fullName = [editingLead?.first_name, editingLead?.last_name].filter(Boolean).join(" ") || "Unnamed Lead";

  const assigneeName = (() => {
    const arr = editingLead?.LeadAssignments || [];
    if (!arr.length) return "-";
    const latest = [...arr].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0];
    return latest?.assignee?.full_name || "-";
  })();

  const sourceLabel = editingLead?.LeadSource?.label || "No source";
  const sourceValue = editingLead?.LeadSource?.value || "";
  const sourceColor = getSourceColor ? getSourceColor(sourceValue) : "gray";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lead Overview & Update" size="xl" centered={true}>
      {!editingLead ? (
        <div className="py-4 text-sm text-gray-600">No lead selected.</div>
      ) : (
        <form onSubmit={handleSubmit(submitHandler)} className="space-y-6 text-sm">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-amber-700 text-sm font-semibold">
                    {(editingLead?.first_name?.[0] || editingLead?.last_name?.[0] || "L").toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{fullName}</div>
                  <div className="text-xs text-gray-500">{editingLead?.company || "—"}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge text={editingLead?.email || "No email"} color="gray" size="sm" icon="mdi:email-outline" />
                <Badge text={editingLead?.phone || "No phone"} color="gray" size="sm" icon="mdi:phone-outline" />
                <Badge text={sourceLabel} color={sourceColor} size="sm" icon="mdi:source-branch" />
                <Badge text={assigneeName} color="indigo" size="sm" icon="mdi:account-circle-outline" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">Update Status</h3>
            <Select
              label="Status"
              value={watch("status_id") || ""}
              onChange={(val) => setValue("status_id", val)}
              options={statuses}
              placeholder="Select Status"
              error={errors.status_id?.message}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <KV label="Company" value={editingLead?.company || "-"} />
              <KV label="Country" value={editingLead?.country || "-"} />
            </div>
          </div>

          <div className="pt-1 flex justify-end gap-2">
            <GrayButton text="Cancel" onClick={onClose} />
            <AccentButton type="submit" text="Save Changes" loading={loading} />
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SalesLeadsModal;
