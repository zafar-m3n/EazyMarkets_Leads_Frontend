import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import Heading from "@/components/ui/Heading";
import LeadsTable from "./components/LeadsTable";
import LeadsFiltersToolbar from "./components/LeadsFiltersToolbar";
import ConfirmAssignModal from "./components/ConfirmAssignModal";
import IconComponent from "@/components/ui/Icon";
import token from "@/lib/utilities";
import SalesLeadDetailsModal from "./components/SalesLeadDetailsModal";

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
    orderBy: stored.orderBy ?? DEFAULT_FILTERS.orderBy,
    orderDir: stored.orderDir ?? DEFAULT_FILTERS.orderDir,
    assignedFrom: stored.assignedFrom ?? DEFAULT_FILTERS.assignedFrom,
    assignedTo: stored.assignedTo ?? DEFAULT_FILTERS.assignedTo,
    limit: Number(stored.limit ?? DEFAULT_FILTERS.limit),
    page: Number(stored.page ?? DEFAULT_FILTERS.page),
    search: DEFAULT_FILTERS.search,
  };
};

const ManagersList = ({ managers = [] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        type="button"
      >
        <span className="flex items-center gap-2">
          <IconComponent icon="mdi:account-multiple" width={18} className="text-gray-700" />
          Managers
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
            {managers.length}
          </span>
        </span>
        <IconComponent icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} />
      </button>

      <div
        className={`overflow-hidden border-t border-gray-100 transition-all duration-200 ${
          open ? "visible max-h-[320px] opacity-100" : "hidden max-h-0 opacity-0"
        }`}
      >
        {managers.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <IconComponent icon="mdi:account-alert-outline" width={18} />
              <span className="italic">No manager assigned</span>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {managers.map((m) => (
              <li key={m.id} className="px-3 py-2">
                <div className="truncate text-sm font-medium text-gray-900">{m.full_name || "Manager"}</div>
                <div className="truncate text-xs text-gray-500">{m.email}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const SalesLeads = () => {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [myManagers, setMyManagers] = useState([]);
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(false);

  const initial = useRef(getInitialFilters()).current;

  const [page, setPage] = useState(() => initial.page);
  const [limit, setLimit] = useState(() => initial.limit);
  const [totalPages, setTotalPages] = useState(1);

  const [statusIds, setStatusIds] = useState(() => initial.statusIds);
  const [sourceIds, setSourceIds] = useState(() => initial.sourceIds);
  const [orderBy, setOrderBy] = useState(() => initial.orderBy);
  const [orderDir, setOrderDir] = useState(() => initial.orderDir);
  const [search, setSearch] = useState(() => initial.search);
  const [assignedFrom, setAssignedFrom] = useState(() => initial.assignedFrom);
  const [assignedTo, setAssignedTo] = useState(() => initial.assignedTo);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState(null);

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
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch leads");
    } finally {
      if (fetchId === fetchGuard.current) setLoading(false);
    }
  }, [page, limit, statusIds, sourceIds, orderBy, orderDir, debouncedSearch, assignedFrom, assignedTo]);

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

  const fetchMyManagers = useCallback(async () => {
    try {
      const res = await API.private.getMyManager();
      if (res.data?.code === "OK" && Array.isArray(res.data.data)) {
        setMyManagers(res.data.data);
      } else {
        setMyManagers([]);
      }
    } catch {
      setMyManagers([]);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await API.private.getProfile?.();
      if (res?.data?.code === "OK") {
        setMe(res.data.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatuses();
    fetchSources();
    fetchMyManagers();
    fetchProfile();
  }, [fetchStatuses, fetchSources, fetchMyManagers, fetchProfile]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    token.setPersistedLeadsFilters({
      statusIds,
      sourceIds,
      orderBy,
      orderDir,
      assignedFrom,
      assignedTo,
      limit,
      page,
    });
  }, [statusIds, sourceIds, orderBy, orderDir, assignedFrom, assignedTo, limit, page]);

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

  const handleOpenDetails = (lead) => {
    setActiveLeadId(lead.id);
    setDetailsModalOpen(true);
  };

  const handleAssignOptionClick = (lead, managerChoice) => {
    if (!myManagers.length) {
      Notification.error("You are not assigned to a manager.");
      return;
    }

    setLeadToAssign(lead);
    setSelectedAssignee(managerChoice || myManagers[0]);
    setIsAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!leadToAssign || !selectedAssignee) return;

    try {
      await API.private.assignLead(leadToAssign.id, { assignee_id: selectedAssignee.id });
      Notification.success("Lead assigned to your manager");
      await fetchLeads();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to assign lead");
    } finally {
      setIsAssignModalOpen(false);
      setLeadToAssign(null);
      setSelectedAssignee(null);
    }
  };

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

    if ("search" in partial && partial.search !== search) {
      setSearch(partial.search);
      changed = true;
    }

    if ("statusIds" in partial) {
      const next = Array.isArray(partial.statusIds) ? partial.statusIds : [];
      const same =
        Array.isArray(next) &&
        Array.isArray(statusIds) &&
        next.length === statusIds.length &&
        next.every((v, i) => String(v) === String(statusIds[i]));

      if (!same) {
        setStatusIds(next);
        changed = true;
      }
    }

    if ("sourceIds" in partial) {
      const next = Array.isArray(partial.sourceIds) ? partial.sourceIds : [];
      const same =
        Array.isArray(next) &&
        Array.isArray(sourceIds) &&
        next.length === sourceIds.length &&
        next.every((v, i) => String(v) === String(sourceIds[i]));

      if (!same) {
        setSourceIds(next);
        changed = true;
      }
    }

    if ("orderBy" in partial && partial.orderBy !== orderBy) {
      setOrderBy(partial.orderBy);
      changed = true;
    }

    if ("orderDir" in partial && partial.orderDir !== orderDir) {
      setOrderDir(partial.orderDir);
      changed = true;
    }

    if ("assignedFrom" in partial && partial.assignedFrom !== assignedFrom) {
      setAssignedFrom(partial.assignedFrom);
      changed = true;
    }

    if ("assignedTo" in partial && partial.assignedTo !== assignedTo) {
      setAssignedTo(partial.assignedTo);
      changed = true;
    }

    if (changed) setPage(1);
  };

  const resetAllFilters = () => {
    setStatusIds(DEFAULT_FILTERS.statusIds);
    setSourceIds(DEFAULT_FILTERS.sourceIds);
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
      orderBy: DEFAULT_FILTERS.orderBy,
      orderDir: DEFAULT_FILTERS.orderDir,
      assignedFrom: DEFAULT_FILTERS.assignedFrom,
      assignedTo: DEFAULT_FILTERS.assignedTo,
      limit: DEFAULT_FILTERS.limit,
      page: DEFAULT_FILTERS.page,
    });
  };

  const idsOnCurrentPage = useMemo(() => leads.map((l) => l.id), [leads]);

  const handleDetailsModalRefresh = async (maybeLeadId) => {
    if (maybeLeadId) {
      setActiveLeadId(Number(maybeLeadId));
    }
    await fetchLeads();
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <Heading>My Leads</Heading>

          <div className="w-full md:w-auto md:min-w-[360px]">
            <ManagersList managers={myManagers} />
          </div>
        </div>

        <LeadsFiltersToolbar
          statuses={statuses}
          sources={sources}
          sortFields={sortFields}
          orderDirOptions={orderDirOptions}
          values={{
            search,
            statusIds,
            sourceIds,
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

        <div className="relative">
          {loading ? (
            <Spinner message="Loading leads..." />
          ) : (
            <>
              <LeadsTable
                leads={leads}
                onEdit={handleOpenDetails}
                onDelete={null}
                managers={myManagers}
                onAssignOptionClick={handleAssignOptionClick}
                mode="sales"
                selfId={me?.id || null}
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

        <ConfirmAssignModal
          isOpen={isAssignModalOpen}
          lead={leadToAssign}
          assignee={selectedAssignee}
          onCancel={() => setIsAssignModalOpen(false)}
          onConfirm={handleAssign}
        />

        <SalesLeadDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setActiveLeadId(null);
          }}
          leadId={activeLeadId}
          statuses={statuses}
          orderedLeadIds={idsOnCurrentPage}
          onLeadUpdated={handleDetailsModalRefresh}
        />
      </div>
    </DefaultLayout>
  );
};

export default SalesLeads;
