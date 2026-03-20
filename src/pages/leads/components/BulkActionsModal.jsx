import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Select from "@/components/form/Select";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";

/**
 * BulkActionsModal
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - selectedCount: number
 * - selectedIds: number[] | string[]
 * - targetOptions: [{ value, label }]                 // assignee options
 * - statusOptions: [{ value, label }]                 // statuses (id->value)
 * - sourceOptions: [{ value, label }]                 // sources (id->value)
 * - onBulkAssign: async ({ assigneeId, overwrite, statusId? }) => void
 * - onBulkStatus: async ({ statusId }) => void
 * - onBulkSource: async ({ sourceId }) => void
 * - onBulkDelete: async () => void
 * - canAssign: boolean
 */
const BulkActionsModal = ({
  isOpen,
  onClose,
  selectedCount = 0,
  selectedIds = [],
  targetOptions = [],
  statusOptions = [],
  sourceOptions = [],
  onBulkAssign,
  onBulkStatus,
  onBulkSource,
  onBulkDelete,
  canAssign = true,
}) => {
  const availableActions = useMemo(() => {
    const list = [];
    if (canAssign) list.push("assign");
    list.push("status", "source", "delete");
    return list;
  }, [canAssign]);

  // Active tab/action (null = render nothing)
  const [activeAction, setActiveAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Assign local state
  const [assigneeId, setAssigneeId] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [assignStatusId, setAssignStatusId] = useState(""); // OPTIONAL status with assign

  // Status local state
  const [statusId, setStatusId] = useState("");

  // Source local state
  const [sourceId, setSourceId] = useState("");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveAction(null); // render nothing by default
      setAssigneeId("");
      setOverwrite(false);
      setAssignStatusId("");
      setStatusId("");
      setSourceId("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const ActionButton = ({ id, label }) => {
    const isActive = activeAction === id;
    return (
      <button
        type="button"
        onClick={() => setActiveAction(id)}
        className={[
          "px-3 py-2 rounded text-sm font-medium transition",
          isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const handleAssign = async () => {
    if (!assigneeId) {
      alert("Please choose an assignee.");
      return;
    }
    try {
      setSubmitting(true);
      await onBulkAssign({
        assigneeId,
        overwrite,
        // only pass when chosen
        ...(assignStatusId ? { statusId: assignStatusId } : {}),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async () => {
    if (!statusId) {
      alert("Please choose a status.");
      return;
    }
    try {
      setSubmitting(true);
      await onBulkStatus({ statusId });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSource = async () => {
    if (!sourceId) {
      alert("Please choose a source.");
      return;
    }
    try {
      setSubmitting(true);
      await onBulkSource({ sourceId });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await onBulkDelete();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Bulk Actions"
      size="xl"
      closeOnOverlayClick={!submitting}
      disableEscapeClose={submitting}
    >
      {/* In-modal action buttons */}
      <div className="flex justify-center items-center gap-2 mb-5">
        {canAssign && <ActionButton id="assign" label="Assign Selected" />}
        <ActionButton id="status" label="Update Status" />
        <ActionButton id="source" label="Update Source" />
        <ActionButton id="delete" label="Delete Selected" />
      </div>

      {/* Nothing by default */}
      {!activeAction && <div className="text-sm text-gray-500">Choose an action above to continue.</div>}

      {/* Assign panel (with optional status) */}
      {activeAction === "assign" && canAssign && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Assign <span className="font-semibold">{selectedCount}</span> lead
            {selectedCount === 1 ? "" : "s"} to the selected user.
          </p>

          <Select
            label="Assign to"
            value={assigneeId}
            onChange={(val) => setAssigneeId(val)}
            options={targetOptions}
            placeholder="Choose user…"
          />

          <Select
            label="(Optional) Also set status"
            value={assignStatusId}
            onChange={(val) => setAssignStatusId(val)}
            options={statusOptions}
            placeholder="Leave blank to keep current"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Overwrite existing assignees (otherwise, already-assigned leads will be skipped)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <div className="w-fit">
              <GrayButton text="Cancel" onClick={onClose} disabled={submitting} />
            </div>
            <div className="w-fit">
              <AccentButton
                text={submitting ? "Assigning..." : "Assign"}
                onClick={handleAssign}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Status panel */}
      {activeAction === "status" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update the status for <span className="font-semibold">{selectedCount}</span> selected lead
            {selectedCount === 1 ? "" : "s"}.
          </p>

          <Select
            label="Status"
            value={statusId}
            onChange={(val) => setStatusId(val)}
            options={statusOptions}
            placeholder="Choose status…"
          />

          <div className="flex justify-end gap-3 pt-2">
            <div className="w-fit">
              <GrayButton text="Cancel" onClick={onClose} disabled={submitting} />
            </div>
            <div className="w-fit">
              <AccentButton
                text={submitting ? "Updating..." : "Update Status"}
                onClick={handleStatus}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Source panel */}
      {activeAction === "source" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update the source for <span className="font-semibold">{selectedCount}</span> selected lead
            {selectedCount === 1 ? "" : "s"}.
          </p>

          <Select
            label="Source"
            value={sourceId}
            onChange={(val) => setSourceId(val)}
            options={sourceOptions}
            placeholder="Choose source…"
          />

          <div className="flex justify-end gap-3 pt-2">
            <div className="w-fit">
              <GrayButton text="Cancel" onClick={onClose} disabled={submitting} />
            </div>
            <div className="w-fit">
              <AccentButton
                text={submitting ? "Updating..." : "Update Source"}
                onClick={handleSource}
                disabled={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete panel — styling matches your existing pattern */}
      {activeAction === "delete" && (
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            This will <strong>permanently delete</strong> {selectedCount} lead
            {selectedCount === 1 ? "" : "s"}. This action cannot be undone.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-sm px-4 py-1.5 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="text-sm px-4 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BulkActionsModal;
