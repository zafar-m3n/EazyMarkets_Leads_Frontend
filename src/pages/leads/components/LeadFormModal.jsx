import React, { useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import TextInput from "@/components/form/TextInput";
import PhoneInput from "@/components/form/PhoneInput";
import Select from "@/components/form/Select";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";

import countryList from "react-select-country-list";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

const schema = Yup.object().shape({
  status_id: Yup.string().required("Status is required"),
  email: Yup.string().nullable().email("Invalid email"),
});

const LeadFormModal = ({ isOpen, onClose, onSubmit, editingLead, statuses, sources, loading }) => {
  const countryOptions = useMemo(() => countryList().getData(), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...editingLead },
  });

  useEffect(() => {
    reset(editingLead || {});
  }, [editingLead, reset]);

  const submitHandler = (data) => {
    onSubmit({
      ...data,
      phone: data.phone || null,
      notes: editingLead ? undefined : data.notes?.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingLead ? "Edit Lead" : "Add Lead"} size="xxl" centered={true}>
      <form onSubmit={handleSubmit(submitHandler)} className="space-y-5 text-sm">
        <div>
          <h3 className="text-xs font-semibold text-gray-600 mb-2">Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput label="First Name" placeholder="Enter first name" {...register("first_name")} />
            <TextInput label="Last Name" placeholder="Enter last name" {...register("last_name")} />
            <TextInput label="Company" placeholder="Enter company" {...register("company")} />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">Contact Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              label="Email"
              type="email"
              placeholder="Enter email"
              {...register("email")}
              error={errors.email?.message}
            />

            <PhoneInput
              label="Phone"
              value={watch("phone") || ""}
              onChange={(val) => setValue("phone", val)}
              error={errors.phone?.message}
            />

            <Select
              label="Country"
              value={watch("country") || ""}
              onChange={(val) => setValue("country", val)}
              options={countryOptions}
              placeholder="Select Country"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">Lead Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Status"
              value={watch("status_id") || ""}
              onChange={(val) => setValue("status_id", val)}
              options={statuses}
              placeholder="Select Status"
              error={errors.status_id?.message}
            />

            <Select
              label="Source"
              value={watch("source_id") || ""}
              onChange={(val) => setValue("source_id", val)}
              options={sources}
              placeholder="Select Source"
            />
          </div>
        </div>

        {!editingLead && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Notes</h3>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Enter notes"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}

        <div className="pt-3 flex justify-end gap-2">
          <GrayButton text="Cancel" onClick={onClose} />
          <AccentButton type="submit" text={editingLead ? "Update Lead" : "Create Lead"} loading={loading} />
        </div>
      </form>
    </Modal>
  );
};

export default LeadFormModal;
