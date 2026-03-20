import React from "react";
import Modal from "@/components/ui/Modal";

const ConfirmDeleteModal = ({ isOpen, lead, onCancel, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirm Deletion" size="sm">
      <p className="text-sm text-gray-800">
        Are you sure you want to delete lead <span className="font-semibold">{lead?.email || lead?.company}</span>?
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded bg-gray-200 px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded bg-red-500 px-4 py-1.5 text-sm text-white">
          Delete
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
