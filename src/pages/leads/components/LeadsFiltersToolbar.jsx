import React, { useMemo, useState, useRef, useEffect } from "react";
import Select from "@/components/form/Select";
import TextInput from "@/components/form/TextInput";
import MultiSelect from "@/components/form/MultiSelect";
import IconComponent from "@/components/ui/Icon";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// ----- date helpers -----
const toISODate = (d) => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const MIN_DATE = new Date("2020-01-01");
const MAX_DATE = new Date(today.getFullYear(), today.getMonth(), today.getDate());

// ----- styled date picker popover -----
const DatePopover = ({ label, value, onChangeISO, minDate, maxDate, clampMinTo, clampMaxTo }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const effMin = clampMinTo ? new Date(clampMinTo) : minDate;
  const effMax = clampMaxTo ? new Date(clampMaxTo) : maxDate;

  const selectedDate = value ? new Date(value) : null;

  const handlePick = (d) => {
    const iso = toISODate(d);
    onChangeISO(iso);
    setOpen(false);
  };

  return (
    <div className="w-full relative">
      {label && <label className="block mb-1 text-sm font-medium text-gray-800">{label}</label>}

      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white border rounded px-3 py-2 text-left text-sm text-gray-800 
                   placeholder-gray-600 focus:outline-none focus:border-accent transition 
                   border-gray-300 flex items-center justify-between"
      >
        <span className={value ? "" : "text-gray-400"}>{value || "Select date"}</span>
        <IconComponent icon="mdi:calendar" width={18} className="text-gray-600" />
      </button>

      {open && (
        <div ref={popRef} className="absolute z-30 mt-2 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <Calendar
            onChange={handlePick}
            value={selectedDate || undefined}
            minDate={effMin || MIN_DATE}
            maxDate={effMax || MAX_DATE}
            next2Label={null}
            prev2Label={null}
          />

          <div className="mt-2 flex justify-between gap-2">
            <button
              type="button"
              className="text-xs text-gray-600 underline"
              onClick={() => {
                onChangeISO("");
                setOpen(false);
              }}
            >
              Clear
            </button>

            <button type="button" className="text-xs text-gray-600" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ----- main toolbar -----
const LeadsFiltersToolbar = ({
  statuses = [],
  sources = [],
  sortFields = [],
  orderDirOptions = [],
  assigneeOptions = [],
  showAssignee = false,
  values = {
    search: "",
    statusIds: [],
    sourceIds: [],
    assigneeIds: [],
    orderBy: "",
    orderDir: "ASC",
    limit: 25,
    assignedFrom: "",
    assignedTo: "",
  },
  limitOptions = [],
  onLimitChange,
  onChange,
  onResetAll,
}) => {
  const {
    search,
    statusIds = [],
    sourceIds = [],
    assigneeIds = [],
    orderBy,
    orderDir,
    limit,
    assignedFrom,
    assignedTo,
  } = values;

  const getLabel = (arr, val) => arr.find((x) => String(x.value) === String(val))?.label;

  const MAX_STATUS_CHIPS = 4;
  const MAX_SOURCE_CHIPS = 4;
  const MAX_ASSIGNEE_CHIPS = 4;

  const chips = useMemo(() => {
    const items = [];

    if (Array.isArray(statusIds) && statusIds.length) {
      if (statusIds.length <= MAX_STATUS_CHIPS) {
        statusIds.forEach((sid) => {
          items.push({
            key: `status:${sid}`,
            label: `Status: ${getLabel(statuses, sid) || sid}`,
          });
        });
      } else {
        items.push({
          key: "statuses:all",
          label: `Statuses: ${statusIds.length} selected`,
        });
      }
    }

    if (Array.isArray(sourceIds) && sourceIds.length) {
      if (sourceIds.length <= MAX_SOURCE_CHIPS) {
        sourceIds.forEach((sid) => {
          items.push({
            key: `source:${sid}`,
            label: `Source: ${getLabel(sources, sid) || sid}`,
          });
        });
      } else {
        items.push({
          key: "sources:all",
          label: `Sources: ${sourceIds.length} selected`,
        });
      }
    }

    if (showAssignee && Array.isArray(assigneeIds) && assigneeIds.length) {
      if (assigneeIds.length <= MAX_ASSIGNEE_CHIPS) {
        assigneeIds.forEach((aid) => {
          items.push({
            key: `assignee:${aid}`,
            label: `Assignee: ${getLabel(assigneeOptions, aid) || aid}`,
          });
        });
      } else {
        items.push({
          key: "assignees:all",
          label: `Assignees: ${assigneeIds.length} selected`,
        });
      }
    }

    if (orderBy) items.push({ key: "orderBy", label: `Sort: ${getLabel(sortFields, orderBy) || orderBy}` });
    if (orderDir !== "ASC") items.push({ key: "orderDir", label: `Dir: ${orderDir}` });

    if (assignedFrom || assignedTo) {
      const from = assignedFrom || "…";
      const to = assignedTo || "…";
      items.push({ key: "assignedRange", label: `Assigned: ${from} → ${to}` });
    }

    if (search) items.push({ key: "search", label: `Search: “${search}”` });

    return items;
  }, [
    search,
    statusIds,
    sourceIds,
    assigneeIds,
    orderBy,
    orderDir,
    statuses,
    sources,
    assigneeOptions,
    sortFields,
    showAssignee,
    assignedFrom,
    assignedTo,
  ]);

  const hasActiveFilters = chips.length > 0;

  const clearChip = (key) => {
    if (key.startsWith("status:")) {
      const id = key.split(":")[1];
      const next = (statusIds || []).filter((s) => String(s) !== String(id));
      onChange({ statusIds: next });
      return;
    }

    if (key === "statuses:all") {
      onChange({ statusIds: [] });
      return;
    }

    if (key.startsWith("source:")) {
      const id = key.split(":")[1];
      const next = (sourceIds || []).filter((s) => String(s) !== String(id));
      onChange({ sourceIds: next });
      return;
    }

    if (key === "sources:all") {
      onChange({ sourceIds: [] });
      return;
    }

    if (key.startsWith("assignee:")) {
      const id = key.split(":")[1];
      const next = (assigneeIds || []).filter((a) => String(a) !== String(id));
      onChange({ assigneeIds: next });
      return;
    }

    if (key === "assignees:all") {
      onChange({ assigneeIds: [] });
      return;
    }

    if (key === "orderBy") onChange({ orderBy: "" });
    if (key === "orderDir") onChange({ orderDir: "ASC" });
    if (key === "assignedRange") onChange({ assignedFrom: "", assignedTo: "" });
    if (key === "search") onChange({ search: "" });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <TextInput
            label="Search (name / email / phone)"
            placeholder="Type to search…"
            value={search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pr-10"
          />
        </div>

        <div className="flex gap-2 md:ml-3">
          <button
            onClick={() => onChange({ search: "" })}
            disabled={!search}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition ${
              search ? "border-gray-300 hover:bg-gray-50" : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            title="Clear search text"
          >
            <IconComponent icon="mdi:close-circle" width={18} />
            Clear search
          </button>

          <button
            onClick={onResetAll}
            disabled={!hasActiveFilters}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition ${
              hasActiveFilters
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            title="Reset all filters"
          >
            <IconComponent icon="mdi:filter-remove" width={18} />
            Reset filters
            {hasActiveFilters && (
              <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{chips.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MultiSelect
          label="Statuses"
          value={Array.isArray(statusIds) ? statusIds : []}
          onChange={(vals) => onChange({ statusIds: vals })}
          options={statuses}
          placeholder="All statuses"
        />

        <MultiSelect
          label="Sources"
          value={Array.isArray(sourceIds) ? sourceIds : []}
          onChange={(vals) => onChange({ sourceIds: vals })}
          options={sources}
          placeholder="All sources"
        />

        {showAssignee && (
          <MultiSelect
            label="Assignees"
            value={Array.isArray(assigneeIds) ? assigneeIds : []}
            onChange={(vals) => onChange({ assigneeIds: vals })}
            options={assigneeOptions}
            placeholder="All assignees"
          />
        )}

        <Select
          label="Direction"
          value={orderDir}
          onChange={(v) => onChange({ orderDir: v })}
          options={orderDirOptions}
          placeholder="Ascending"
        />

        <DatePopover
          label="Assigned from"
          value={assignedFrom}
          onChangeISO={(v) => onChange({ assignedFrom: v })}
          minDate={MIN_DATE}
          maxDate={MAX_DATE}
          clampMaxTo={assignedTo}
        />

        <DatePopover
          label="Assigned to"
          value={assignedTo}
          onChangeISO={(v) => onChange({ assignedTo: v })}
          minDate={MIN_DATE}
          maxDate={MAX_DATE}
          clampMinTo={assignedFrom}
        />

        <Select
          label="Sort by"
          value={orderBy}
          onChange={(v) => onChange({ orderBy: v })}
          options={sortFields}
          placeholder="Default (ID)"
        />

        {limitOptions.length > 0 && (
          <Select
            label="Rows per page"
            value={limit}
            onChange={onLimitChange}
            options={limitOptions}
            placeholder="25"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.length > 0 ? (
          chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-gray-800"
            >
              <IconComponent icon="mdi:tag-multiple" width={14} className="text-amber-600" />
              {chip.label}
              <button
                onClick={() => clearChip(chip.key)}
                className="rounded-full p-0.5 hover:bg-black/5"
                aria-label="Clear"
                title="Clear"
              >
                <IconComponent icon="mdi:close" width={14} className="text-gray-700" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500">No active filters</span>
        )}
      </div>
    </div>
  );
};

export default LeadsFiltersToolbar;
