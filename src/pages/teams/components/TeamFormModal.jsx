import React, { useEffect } from "react";
import Modal from "@/components/ui/Modal";
import TextInput from "@/components/form/TextInput";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

// ==========================
// Validation Schema
// ==========================
const schema = Yup.object().shape({
  name: Yup.string().required("Team name is required"),
  // multiple managers required (at least one)
  manager_ids: Yup.array()
    .of(Yup.number().typeError("Invalid manager"))
    .min(1, "At least one manager is required")
    .required("At least one manager is required"),
  // members must be an array of numbers (IDs)
  members: Yup.array().of(Yup.number().typeError("Invalid member")).default([]),
});

/**
 * NOTE:
 * - Pass `memberOptions` from parent:
 *   → It must include BOTH unassigned reps and current team members when editing.
 * - `managers` prop is still a flat options array: [{ value, label }]
 */
const TeamFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTeam,
  managers, // options for managers: [{ value, label }]
  memberOptions = [], // merged options (unassigned + current members)
  loading,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      manager_ids: [], // <-- multiple managers
      members: [],
    },
  });

  // Helpers to coerce IDs to numbers
  const toNumbers = (arr) => (Array.isArray(arr) ? arr.map((v) => Number(v)) : []);

  // Reset form whenever modal opens with editing data
  useEffect(() => {
    if (editingTeam) {
      reset({
        name: editingTeam.name || "",
        manager_ids: toNumbers(editingTeam.manager_ids || []),
        members: toNumbers(editingTeam.members || []),
      });
    } else {
      reset({ name: "", manager_ids: [], members: [] });
    }
  }, [editingTeam, reset]);

  const submitHandler = (data) => {
    const payload = {
      name: data.name,
      manager_ids: toNumbers(data.manager_ids),
      members: toNumbers(data.members),
    };
    onSubmit(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTeam ? "Edit Team" : "Add Team"} size="lg">
      <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
        <TextInput label="Team Name" placeholder="Enter team name" {...register("name")} error={errors.name?.message} />

        {/* Managers (multi-select) */}
        <MultiSelect
          label="Managers"
          value={watch("manager_ids") || []}
          onChange={(ids) => setValue("manager_ids", ids)}
          options={managers}
          placeholder="Select Manager(s)"
          error={errors.manager_ids?.message}
        />

        {/* Members */}
        <MultiSelect
          label="Members"
          value={watch("members") || []}
          onChange={(ids) => setValue("members", ids)}
          options={memberOptions}
          placeholder="Select Sales Reps"
          error={errors.members?.message}
        />

        <div className="pt-4 flex justify-end gap-3">
          <div className="w-fit">
            <GrayButton text="Cancel" onClick={onClose} />
          </div>
          <div className="w-fit">
            <AccentButton type="submit" text={editingTeam ? "Update Team" : "Create Team"} loading={loading} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TeamFormModal;
