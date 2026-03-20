import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import Heading from "@/components/ui/Heading";
import AccentButton from "@/components/ui/AccentButton";
import LeadFormModal from "./components/LeadFormModal";
import LeadsTable from "./components/LeadsTable";
import LeadsFiltersToolbar from "./components/LeadsFiltersToolbar";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import ConfirmAssignModal from "./components/ConfirmAssignModal";
import LeadDetailsModal from "./components/LeadDetailsModal";
import token from "@/lib/utilities";
import BulkActionsModal from "./components/BulkActionsModal";

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

const DEFAULT_FILTERS = {
  search: "",
  statusIds: [],
  sourceIds: [],
  assigneeIds: [],
  orderBy: "",
  orderDir: "ASC",
  assignedFrom: "",
  assignedTo: "",
  limit: 25,
  page: 1,
};

const getInitialFilters = () => {
  const stored = token.getPersistedLeadsFilters(DEFAULT_FILTERS) || {};

  return {
    statusIds: Array.isArray(stored.statusIds) ? stored.statusIds : DEFAULT_FILTERS.statusIds,
    sourceIds: Array.isArray(stored.sourceIds) ? stored.sourceIds : DEFAULT_FILTERS.sourceIds,
    assigneeIds: Array.isArray(stored.assigneeIds) ? stored.assigneeIds : DEFAULT_FILTERS.assigneeIds,
    orderBy: stored.orderBy ?? DEFAULT_FILTERS.orderBy,
    orderDir: stored.orderDir ?? DEFAULT_FILTERS.orderDir,
    assignedFrom: stored.assignedFrom ?? DEFAULT_FILTERS.assignedFrom,
    assignedTo: stored.assignedTo ?? DEFAULT_FILTERS.assignedTo,
    limit: Number(stored.limit ?? DEFAULT_FILTERS.limit),
    page: Number(stored.page ?? DEFAULT_FILTERS.page),
    search: DEFAULT_FILTERS.search,
  };
};

const arraysEqualLoose = (a = [], b = []) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => String(v) === String(b[i]));

const ManagerLeads = () => {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [managers, setManagers] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);

  const [bulkTargets, setBulkTargets] = useState([]);
  const bulkTargetOptions = useMemo(
    () =>
      (bulkTargets || []).map((u) => ({
        value: u.id,
        label: u.full_name ? `${u.full_name} (${u.email})` : u.email,
      })),
    [bulkTargets],
  );

  const [loading, setLoading] = useState(false);

  const initial = useRef(getInitialFilters()).current;

  const [page, setPage] = useState(() => initial.page);
  const [limit, setLimit] = useState(() => initial.limit);
  const [totalPages, setTotalPages] = useState(1);

  const [statusIds, setStatusIds] = useState(() => initial.statusIds);
  const [sourceIds, setSourceIds] = useState(() => initial.sourceIds);
  const [assigneeIds, setAssigneeIds] = useState(() => initial.assigneeIds);
  const [orderBy, setOrderBy] = useState(() => initial.orderBy);
  const [orderDir, setOrderDir] = useState(() => initial.orderDir);
  const [search, setSearch] = useState(() => initial.search);
  const [assignedFrom, setAssignedFrom] = useState(() => initial.assignedFrom);
  const [assignedTo, setAssignedTo] = useState(() => initial.assignedTo);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const hasSelection = selectedIds.length > 0;

  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);

  const fetchGuard = useRef(0);

  const fetchLeads = useCallback(async () => {
    const fetchId = ++fetchGuard.current;
    setLoading(true);

    try {
      const params = {
        page: page ?? 1,
        limit,
        status_ids: Array.isArray(statusIds) && statusIds.length ? statusIds.join(",") : undefined,
        source_ids: Array.isArray(sourceIds) && sourceIds.length ? sourceIds.join(",") : undefined,
        assignee_ids: Array.isArray(assigneeIds) && assigneeIds.length ? assigneeIds.join(",") : undefined,
        orderBy: orderBy || undefined,
        orderDir: orderDir || undefined,
        search: debouncedSearch || undefined,
        assigned_from: assignedFrom || undefined,
        assigned_to: assignedTo || undefined,
      };

      const res = await API.private.getLeads(params);

      if (fetchId !== fetchGuard.current) return;

      if (res.data?.code === "OK") {
        setLeads(res.data.data.leads || []);
        setTotalPages(res.data.data.pagination.totalPages);
        setSelectedIds([]);
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch leads");
    } finally {
      if (fetchId === fetchGuard.current) setLoading(false);
    }
  }, [page, limit, statusIds, sourceIds, assigneeIds, orderBy, orderDir, debouncedSearch, assignedFrom, assignedTo]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await API.private.getLeadStatuses();
      if (res.data?.code === "OK") {
        setStatuses(res.data.data.map((s) => ({ value: s.id, label: s.label })));
      }
    } catch {
      Notification.error("Failed to fetch lead statuses");
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await API.private.getLeadSources();
      if (res.data?.code === "OK") {
        setSources(res.data.data.map((s) => ({ value: s.id, label: s.label })));
      }
    } catch {
      Notification.error("Failed to fetch lead sources");
    }
  }, []);

  const fetchAssignableUsers = useCallback(async () => {
    try {
      const res = await API.private.getAssignableUsersForManager();
      if (res.data?.code === "OK") {
        setManagers(res.data.data || []);
      }
    } catch {
      Notification.error("Failed to fetch assignable users");
    }
  }, []);

  const fetchAssignees = useCallback(async () => {
    try {
      const res = await API.private.getAssignees();
      if (res.data?.code === "OK") {
        const options = (res.data.data || []).map((u) => ({
          value: u.id,
          label: u.full_name ? `${u.full_name} (${u.email})` : u.email,
        }));
        setAssigneeOptions(options);
      }
    } catch {
      Notification.error("Failed to fetch assignees");
    }
  }, []);

  const fetchBulkTargets = useCallback(async () => {
    try {
      const res = await API.private.getBulkAssignableTargets();
      if (res?.data?.code === "OK" || res?.data?.success === true) {
        setBulkTargets(res.data.data?.targets || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatuses();
    fetchSources();
    fetchAssignableUsers();
    fetchAssignees();
    fetchBulkTargets();
  }, [fetchStatuses, fetchSources, fetchAssignableUsers, fetchAssignees, fetchBulkTargets]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    token.setPersistedLeadsFilters({
      statusIds,
      sourceIds,
      assigneeIds,
      orderBy,
      orderDir,
      assignedFrom,
      assignedTo,
      limit,
      page,
    });
  }, [statusIds, sourceIds, assigneeIds, orderBy, orderDir, assignedFrom, assignedTo, limit, page]);

  const handleSortClick = useCallback(
    (field) => {
      setPage(1);

      if (orderBy === field) {
        setOrderDir((prevDir) => (prevDir === "ASC" ? "DESC" : "ASC"));
      } else {
        setOrderBy(field);
        setOrderDir("ASC");
      }
    },
    [orderBy],
  );

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (editingLead) {
        await API.private.updateLead(editingLead.id, data);
        Notification.success("Lead updated successfully");
      } else {
        await API.private.createLead(data);
        Notification.success("Lead created successfully");
      }

      await fetchLeads();
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to save lead");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (lead) => {
    setActiveLeadId(lead.id);
    setDetailsModalOpen(true);
  };

  const confirmDelete = (lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;

    try {
      await API.private.deleteLead(leadToDelete.id);
      Notification.success("Lead deleted successfully");
      await fetchLeads();

      if (Number(activeLeadId) === Number(leadToDelete.id)) {
        setDetailsModalOpen(false);
        setActiveLeadId(null);
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to delete lead");
    } finally {
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleAssignOptionClick = (lead, assignee) => {
    setLeadToAssign(lead);
    setSelectedAssignee(assignee);
    setIsAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!leadToAssign || !selectedAssignee) return;

    try {
      await API.private.assignLead(leadToAssign.id, { assignee_id: selectedAssignee.id });
      Notification.success("Lead assigned successfully");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to assign lead");
    } finally {
      setIsAssignModalOpen(false);
      setLeadToAssign(null);
      setSelectedAssignee(null);
    }
  };

  const openBulkActions = () => {
    if (!hasSelection) {
      Notification.error("Please select at least one lead.");
      return;
    }
    setBulkActionsOpen(true);
  };

  const handleBulkAssign = async ({ assigneeId, overwrite, statusId }) => {
    if (!assigneeId) {
      Notification.error("Please choose an assignee.");
      return;
    }

    try {
      await API.private.bulkAssignLeads({
        lead_ids: selectedIds,
        assignee_id: Number(assigneeId),
        overwrite: !!overwrite,
        ...(statusId ? { status_id: Number(statusId) } : {}),
      });
      Notification.success("Leads assigned successfully");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Bulk assign failed");
      throw err;
    }
  };

  const handleBulkStatus = async ({ statusId }) => {
    if (!statusId) {
      Notification.error("Please choose a status.");
      return;
    }

    try {
      await API.private.bulkUpdateLeadStatus({
        lead_ids: selectedIds,
        status_id: Number(statusId),
      });
      Notification.success("Status updated for selected leads");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Bulk status update failed");
      throw err;
    }
  };

  const handleBulkSource = async ({ sourceId }) => {
    if (!sourceId) {
      Notification.error("Please choose a source.");
      return;
    }

    try {
      await API.private.bulkUpdateLeadSource({
        lead_ids: selectedIds,
        source_id: Number(sourceId),
      });
      Notification.success("Source updated for selected leads");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Bulk source update failed");
      throw err;
    }
  };

  const handleBulkDelete = async () => {
    try {
      await API.private.bulkDeleteLeads(selectedIds);
      Notification.success("Leads deleted successfully");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Bulk delete failed");
      throw err;
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = (idsOnPage, checked) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsOnPage])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    }
  };

  const sortFields = useMemo(
    () => [
      { value: "", label: "Default (ID)" },
      { value: "first_name", label: "First name" },
      { value: "last_name", label: "Last name" },
      { value: "email", label: "Email" },
      { value: "company", label: "Company" },
      { value: "created_at", label: "Created at" },
      { value: "updated_at", label: "Updated at" },
      { value: "assigned_at", label: "Assigned at (latest)" },
    ],
    [],
  );

  const orderDirOptions = [
    { value: "ASC", label: "Ascending" },
    { value: "DESC", label: "Descending" },
  ];

  const limitOptions = useMemo(
    () => [
      { value: 10, label: "10" },
      { value: 25, label: "25" },
      { value: 50, label: "50" },
      { value: 100, label: "100" },
      { value: 200, label: "200" },
    ],
    [],
  );

  const handleLimitChange = (newValue) => {
    const next = Number(newValue) || DEFAULT_FILTERS.limit;
    setLimit(next);
    setPage(1);
  };

  const handleToolbarChange = (partial) => {
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(partial, "search") && partial.search !== search) {
      setSearch(partial.search);
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(partial, "statusIds")) {
      const next = Array.isArray(partial.statusIds) ? partial.statusIds : [];
      if (!arraysEqualLoose(next, statusIds)) {
        setStatusIds(next);
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, "sourceIds")) {
      const next = Array.isArray(partial.sourceIds) ? partial.sourceIds : [];
      if (!arraysEqualLoose(next, sourceIds)) {
        setSourceIds(next);
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, "assigneeIds")) {
      const next = Array.isArray(partial.assigneeIds) ? partial.assigneeIds : [];
      if (!arraysEqualLoose(next, assigneeIds)) {
        setAssigneeIds(next);
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, "orderBy") && partial.orderBy !== orderBy) {
      setOrderBy(partial.orderBy);
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(partial, "orderDir") && partial.orderDir !== orderDir) {
      setOrderDir(partial.orderDir);
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(partial, "assignedFrom") && partial.assignedFrom !== assignedFrom) {
      setAssignedFrom(partial.assignedFrom);
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(partial, "assignedTo") && partial.assignedTo !== assignedTo) {
      setAssignedTo(partial.assignedTo);
      changed = true;
    }

    if (changed) setPage(1);
  };

  const resetAllFilters = () => {
    setStatusIds(DEFAULT_FILTERS.statusIds);
    setSourceIds(DEFAULT_FILTERS.sourceIds);
    setAssigneeIds(DEFAULT_FILTERS.assigneeIds);
    setOrderBy(DEFAULT_FILTERS.orderBy);
    setOrderDir(DEFAULT_FILTERS.orderDir);
    setSearch(DEFAULT_FILTERS.search);
    setAssignedFrom(DEFAULT_FILTERS.assignedFrom);
    setAssignedTo(DEFAULT_FILTERS.assignedTo);
    setLimit(DEFAULT_FILTERS.limit);
    setPage(DEFAULT_FILTERS.page);

    token.setPersistedLeadsFilters({
      statusIds: DEFAULT_FILTERS.statusIds,
      sourceIds: DEFAULT_FILTERS.sourceIds,
      assigneeIds: DEFAULT_FILTERS.assigneeIds,
      orderBy: DEFAULT_FILTERS.orderBy,
      orderDir: DEFAULT_FILTERS.orderDir,
      assignedFrom: DEFAULT_FILTERS.assignedFrom,
      assignedTo: DEFAULT_FILTERS.assignedTo,
      limit: DEFAULT_FILTERS.limit,
      page: DEFAULT_FILTERS.page,
    });
  };

  const idsOnCurrentPage = useMemo(() => leads.map((l) => l.id), [leads]);

  const handleInlineStatusUpdate = async (lead, statusOption) => {
    if (!lead || !statusOption?.id) return;

    const prev = leads;
    const now = new Date().toISOString();

    setLeads((ls) =>
      ls.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              status_id: statusOption.id,
              LeadStatus: { id: statusOption.id, value: statusOption.value, label: statusOption.label },
              updated_at: now,
            }
          : l,
      ),
    );

    try {
      await API.private.updateLead(lead.id, { status_id: statusOption.id });
      await fetchLeads();
      Notification.success("Status updated");
    } catch (err) {
      setLeads(prev);
      Notification.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleDetailsModalRefresh = async (maybeLeadId) => {
    if (maybeLeadId) {
      setActiveLeadId(Number(maybeLeadId));
    }
    await fetchLeads();
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Heading>Manager Leads</Heading>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openBulkActions}
              className="px-4 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              disabled={!hasSelection}
            >
              Bulk Actions
            </button>

            <div className="w-fit">
              <AccentButton
                text="Add Lead"
                onClick={() => {
                  setEditingLead(null);
                  setIsModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        <LeadsFiltersToolbar
          statuses={statuses}
          sources={sources}
          sortFields={sortFields}
          orderDirOptions={orderDirOptions}
          assigneeOptions={assigneeOptions}
          showAssignee={true}
          values={{
            search,
            statusIds,
            sourceIds,
            assigneeIds,
            orderBy,
            orderDir,
            limit,
            assignedFrom,
            assignedTo,
          }}
          limitOptions={limitOptions}
          onLimitChange={handleLimitChange}
          onChange={handleToolbarChange}
          onResetAll={resetAllFilters}
        />

        {hasSelection && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{selectedIds.length}</span> selected on this page.
          </div>
        )}

        <div className="relative">
          {loading ? (
            <Spinner message="Loading leads..." />
          ) : (
            <>
              <LeadsTable
                leads={leads}
                onEdit={handleOpenDetails}
                onDelete={confirmDelete}
                managers={managers}
                onAssignOptionClick={handleAssignOptionClick}
                mode="manager"
                showSelection={true}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={(checked) => toggleSelectAll(idsOnCurrentPage, checked)}
                statuses={statuses}
                onStatusUpdate={handleInlineStatusUpdate}
                orderBy={orderBy}
                orderDir={orderDir}
                onSortClick={handleSortClick}
              />

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                className="mt-2"
              />
            </>
          )}
        </div>

        <LeadFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
          }}
          onSubmit={handleSubmit}
          editingLead={editingLead}
          statuses={statuses}
          sources={sources}
          loading={loading}
        />

        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          lead={leadToDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />

        <ConfirmAssignModal
          isOpen={isAssignModalOpen}
          lead={leadToAssign}
          assignee={selectedAssignee}
          onCancel={() => setIsAssignModalOpen(false)}
          onConfirm={handleAssign}
        />

        <BulkActionsModal
          isOpen={bulkActionsOpen}
          onClose={() => setBulkActionsOpen(false)}
          selectedCount={selectedIds.length}
          selectedIds={selectedIds}
          targetOptions={bulkTargetOptions}
          statusOptions={statuses}
          sourceOptions={sources}
          onBulkAssign={handleBulkAssign}
          onBulkStatus={handleBulkStatus}
          onBulkSource={handleBulkSource}
          onBulkDelete={handleBulkDelete}
          canAssign={true}
        />

        <LeadDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setActiveLeadId(null);
          }}
          leadId={activeLeadId}
          statuses={statuses}
          sources={sources}
          orderedLeadIds={idsOnCurrentPage}
          onLeadUpdated={handleDetailsModalRefresh}
        />
      </div>
    </DefaultLayout>
  );
};

export default ManagerLeads;
