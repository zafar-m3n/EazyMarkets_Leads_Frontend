// src/pages/admin/AdminSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Pagination from "@/components/ui/Pagination";
import Table from "@/components/ui/Table";
import IconComponent from "@/components/ui/Icon";
import Heading from "@/components/ui/Heading";
import AccentButton from "@/components/ui/AccentButton";
import Modal from "@/components/ui/Modal";
import TextInput from "@/components/form/TextInput";
import GrayButton from "@/components/ui/GrayButton";

// -------------------------------------
// Small helpers
// -------------------------------------
const isOK = (res) => res?.data?.code === "OK" || res?.data?.success === true;
const pickListPayload = (res) => {
  // Support both shapes:
  // { code:'OK', data:{ items, pages } }  OR  { success:true, data:[...], paging:{ totalPages } }
  if (res?.data?.data?.teams) return { items: res.data.data.teams, totalPages: res.data.data.pages || 1 };
  if (Array.isArray(res?.data?.data)) return { items: res.data.data, totalPages: res?.data?.paging?.totalPages || 1 };
  if (res?.data?.data?.items) return { items: res.data.data.items, totalPages: res?.data?.data?.totalPages || 1 };
  return { items: [], totalPages: 1 };
};

// -------------------------------------
// Reusable Add/Edit Modal for label
// -------------------------------------
const LabelFormModal = ({ isOpen, onClose, onSubmit, editing, loading }) => {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(editing?.label || "");
  }, [editing]);

  const submit = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      Notification.error("Label is required");
      return;
    }
    onSubmit({ label: label.trim() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit" : "Add"} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <TextInput
          label="Label"
          placeholder="e.g., LinkedIn"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="pt-2 flex justify-end gap-3">
          <div className="w-fit">
            <GrayButton text="Cancel" onClick={onClose} />
          </div>
          <div className="w-fit">
            <AccentButton type="submit" text={editing ? "Update" : "Create"} loading={loading} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

// -------------------------------------
// Main Component
// -------------------------------------
const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("sources"); // 'sources' | 'statuses'

  // Common UI state
  const [loading, setLoading] = useState(false);

  // Sources state
  const [sources, setSources] = useState([]);
  const [sourcesPage, setSourcesPage] = useState(1);
  const [sourcesTotalPages, setSourcesTotalPages] = useState(1);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [deleteSourceModalOpen, setDeleteSourceModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState(null);

  // Statuses state
  const [statuses, setStatuses] = useState([]);
  const [statusesPage, setStatusesPage] = useState(1);
  const [statusesTotalPages, setStatusesTotalPages] = useState(1);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [deleteStatusModalOpen, setDeleteStatusModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState(null);

  // -------------------------------------
  // Fetchers
  // -------------------------------------
  const fetchSources = async (page = sourcesPage) => {
    try {
      const res = await API.private.listAdminLeadSources({ page, pageSize: 10 });
      if (!isOK(res)) {
        Notification.error(res?.data?.error || "Failed to fetch lead sources");
        return;
      }
      const { items, totalPages } = pickListPayload(res);
      setSources(items || []);
      setSourcesTotalPages(totalPages || 1);
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch lead sources");
    }
  };

  const fetchStatuses = async (page = statusesPage) => {
    try {
      const res = await API.private.listAdminLeadStatuses({ page, pageSize: 10 });
      if (!isOK(res)) {
        Notification.error(res?.data?.error || "Failed to fetch lead statuses");
        return;
      }
      const { items, totalPages } = pickListPayload(res);
      setStatuses(items || []);
      setStatusesTotalPages(totalPages || 1);
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch lead statuses");
    }
  };

  useEffect(() => {
    if (activeTab === "sources") fetchSources(sourcesPage);
    if (activeTab === "statuses") fetchStatuses(statusesPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sourcesPage, statusesPage]);

  // -------------------------------------
  // CRUD Handlers: Sources
  // -------------------------------------
  const openAddSource = () => {
    setEditingSource(null);
    setSourceModalOpen(true);
  };

  const openEditSource = (row) => {
    setEditingSource(row);
    setSourceModalOpen(true);
  };

  const submitSource = async ({ label }) => {
    setLoading(true);
    try {
      let res;
      if (editingSource) {
        res = await API.private.updateAdminLeadSource(editingSource.id, { label });
      } else {
        res = await API.private.createAdminLeadSource({ label });
      }
      if (isOK(res)) {
        Notification.success(editingSource ? "Lead source updated" : "Lead source created");
        setSourceModalOpen(false);
        setEditingSource(null);
        await fetchSources();
      } else {
        Notification.error(res?.data?.error || "Failed to save lead source");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to save lead source");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteSource = (row) => {
    setSourceToDelete(row);
    setDeleteSourceModalOpen(true);
  };

  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;
    try {
      const res = await API.private.deleteAdminLeadSource(sourceToDelete.id);
      if (isOK(res)) {
        Notification.success("Lead source deleted");
        await fetchSources();
      } else {
        Notification.error(res?.data?.error || "Failed to delete lead source");
      }
    } catch (err) {
      // 409 -> in use
      const msg = err.response?.data?.error || "Failed to delete lead source";
      Notification.error(msg);
    } finally {
      setDeleteSourceModalOpen(false);
      setSourceToDelete(null);
    }
  };

  // -------------------------------------
  // CRUD Handlers: Statuses
  // -------------------------------------
  const openAddStatus = () => {
    setEditingStatus(null);
    setStatusModalOpen(true);
  };

  const openEditStatus = (row) => {
    setEditingStatus(row);
    setStatusModalOpen(true);
  };

  const submitStatus = async ({ label }) => {
    setLoading(true);
    try {
      let res;
      if (editingStatus) {
        res = await API.private.updateAdminLeadStatus(editingStatus.id, { label });
      } else {
        res = await API.private.createAdminLeadStatus({ label });
      }
      if (isOK(res)) {
        Notification.success(editingStatus ? "Lead status updated" : "Lead status created");
        setStatusModalOpen(false);
        setEditingStatus(null);
        await fetchStatuses();
      } else {
        Notification.error(res?.data?.error || "Failed to save lead status");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to save lead status");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteStatus = (row) => {
    setStatusToDelete(row);
    setDeleteStatusModalOpen(true);
  };

  const handleDeleteStatus = async () => {
    if (!statusToDelete) return;
    try {
      const res = await API.private.deleteAdminLeadStatus(statusToDelete.id);
      if (isOK(res)) {
        Notification.success("Lead status deleted");
        await fetchStatuses();
      } else {
        Notification.error(res?.data?.error || "Failed to delete lead status");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete lead status";
      Notification.error(msg);
    } finally {
      setDeleteStatusModalOpen(false);
      setStatusToDelete(null);
    }
  };

  // -------------------------------------
  // Tables
  // -------------------------------------
  const columns = useMemo(
    () => [
      { key: "label", label: "Label" },
      { key: "value", label: "Value" },
      { key: "actions", label: "Actions" },
    ],
    []
  );

  const renderActions = (row, type) => (
    <div className="flex space-x-2">
      <button
        onClick={() => (type === "source" ? openEditSource(row) : openEditStatus(row))}
        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        title="Edit"
      >
        <IconComponent icon="mdi:pencil" width={20} className="text-gray-800" />
      </button>
      <button
        onClick={() => (type === "source" ? confirmDeleteSource(row) : confirmDeleteStatus(row))}
        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        title="Delete"
      >
        <IconComponent icon="mdi:delete" width={20} className="text-gray-800" />
      </button>
    </div>
  );

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Heading + Add Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Heading>Admin Settings</Heading>
          <div className="flex gap-2">
            {activeTab === "sources" ? (
              <AccentButton text="Add Source" onClick={openAddSource} />
            ) : (
              <AccentButton text="Add Status" onClick={openAddStatus} />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${
              activeTab === "sources"
                ? "border-gray-800 text-gray-900 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("sources")}
          >
            Lead Sources
          </button>
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${
              activeTab === "statuses"
                ? "border-gray-800 text-gray-900 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("statuses")}
          >
            Lead Statuses
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "sources" ? (
          <>
            <Table
              columns={columns}
              data={sources}
              emptyMessage="No lead sources found."
              renderCell={(row, col) => {
                switch (col.key) {
                  case "actions":
                    return renderActions(row, "source");
                  default:
                    return row[col.key] || "-";
                }
              }}
            />
            {sourcesTotalPages >= 1 && (
              <Pagination
                currentPage={sourcesPage}
                totalPages={sourcesTotalPages}
                onPageChange={(p) => setSourcesPage(p)}
                className="mt-4"
              />
            )}

            {/* Add/Edit Source Modal */}
            <LabelFormModal
              isOpen={sourceModalOpen}
              onClose={() => {
                setSourceModalOpen(false);
                setEditingSource(null);
              }}
              onSubmit={submitSource}
              editing={editingSource}
              loading={loading}
            />

            {/* Delete Source Modal */}
            <Modal
              isOpen={deleteSourceModalOpen}
              onClose={() => setDeleteSourceModalOpen(false)}
              title="Confirm Deletion"
              size="sm"
            >
              <p>
                Are you sure you want to delete <span className="font-semibold">{sourceToDelete?.label}</span>?
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setDeleteSourceModalOpen(false)}
                  className="text-sm px-4 py-1.5 rounded bg-gray-300"
                >
                  Cancel
                </button>
                <button onClick={handleDeleteSource} className="text-sm px-4 py-1.5 rounded bg-red-500 text-white">
                  Delete
                </button>
              </div>
            </Modal>
          </>
        ) : (
          <>
            <Table
              columns={columns}
              data={statuses}
              emptyMessage="No lead statuses found."
              renderCell={(row, col) => {
                switch (col.key) {
                  case "actions":
                    return renderActions(row, "status");
                  default:
                    return row[col.key] || "-";
                }
              }}
            />
            {statusesTotalPages >= 1 && (
              <Pagination
                currentPage={statusesPage}
                totalPages={statusesTotalPages}
                onPageChange={(p) => setStatusesPage(p)}
                className="mt-4"
              />
            )}

            {/* Add/Edit Status Modal */}
            <LabelFormModal
              isOpen={statusModalOpen}
              onClose={() => {
                setStatusModalOpen(false);
                setEditingStatus(null);
              }}
              onSubmit={submitStatus}
              editing={editingStatus}
              loading={loading}
            />

            {/* Delete Status Modal */}
            <Modal
              isOpen={deleteStatusModalOpen}
              onClose={() => setDeleteStatusModalOpen(false)}
              title="Confirm Deletion"
              size="sm"
            >
              <p>
                Are you sure you want to delete <span className="font-semibold">{statusToDelete?.label}</span>?
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setDeleteStatusModalOpen(false)}
                  className="text-sm px-4 py-1.5 rounded bg-gray-300"
                >
                  Cancel
                </button>
                <button onClick={handleDeleteStatus} className="text-sm px-4 py-1.5 rounded bg-red-500 text-white">
                  Delete
                </button>
              </div>
            </Modal>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AdminSettings;
