import React from "react";
import Modal from "@/components/ui/Modal";

const ConfirmAssignModal = ({ isOpen, lead, assignee, onCancel, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirm Assignment" size="sm">
      <p className="text-sm text-gray-800">
        Assign lead <span className="font-semibold">{lead?.email || lead?.company}</span> to{" "}
        <span className="font-semibold">
          {assignee?.full_name} ({assignee?.email})
        </span>
        ?
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded bg-gray-200 px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white">
          Yes, Assign
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmAssignModal;
