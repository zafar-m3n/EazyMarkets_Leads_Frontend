// src/pages/admin/LeadExport.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import Heading from "@/components/ui/Heading";
import Spinner from "@/components/ui/Spinner";
import Notification from "@/components/ui/Notification";
import API from "@/services/index";
import MultiSelect from "@/components/form/MultiSelect";
import Modal from "@/components/ui/Modal";
import AccentButton from "@/components/ui/AccentButton";

/* Debounce hook */
function useDebounce(value, delay = 450) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const Pill = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
    {children}
    {onRemove && (
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove} aria-label="Remove" type="button">
        ✕
      </button>
    )}
  </span>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);

const LeadExport = () => {
  // lookups
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // filters
  const [statusIds, setStatusIds] = useState([]);
  const [sourceIds, setSourceIds] = useState([]);

  // debounced filters
  const dStatusIds = useDebounce(statusIds);
  const dSourceIds = useDebounce(sourceIds);

  // count / export
  const [countLoading, setCountLoading] = useState(false);
  const [exportCount, setExportCount] = useState(null);
  const [countError, setCountError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const didLoadLookups = useRef(false);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await API.private.getLeadStatuses();
      if (res.data?.code === "OK") {
        setStatuses(res.data.data.map((s) => ({ value: s.id, label: s.label })));
      }
    } catch {
      Notification.error("Failed to load statuses");
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await API.private.getLeadSources();
      if (res.data?.code === "OK") {
        setSources(res.data.data.map((s) => ({ value: s.id, label: s.label })));
      }
    } catch {
      Notification.error("Failed to load sources");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      await Promise.all([fetchStatuses(), fetchSources()]);
      setLoadingLookups(false);
      didLoadLookups.current = true;
    })();
  }, [fetchStatuses, fetchSources]);

  const buildFilters = (ids1 = statusIds, ids2 = sourceIds) => ({
    status_ids: ids1.length ? ids1.join(",") : undefined,
    source_ids: ids2.length ? ids2.join(",") : undefined,
  });

  // Auto-count on filter changes (debounced)
  useEffect(() => {
    if (!didLoadLookups.current) return;

    let cancelled = false;
    (async () => {
      setCountLoading(true);
      setCountError(null);
      setExportCount(null);
      try {
        const res = await API.private.getLeadsExportCount(buildFilters(dStatusIds, dSourceIds));
        if (!cancelled) {
          if (res.data?.code === "OK") setExportCount(res.data.data.count ?? 0);
          else setCountError(res.data?.error || "Failed to get count");
        }
      } catch (err) {
        if (!cancelled) setCountError(err?.response?.data?.error || "Failed to get count");
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dStatusIds, dSourceIds]);

  const manualRefresh = async () => {
    setCountLoading(true);
    setCountError(null);
    setExportCount(null);
    try {
      const res = await API.private.getLeadsExportCount(buildFilters());
      if (res.data?.code === "OK") setExportCount(res.data.data.count ?? 0);
      else setCountError(res.data?.error || "Failed to get count");
    } catch (err) {
      setCountError(err?.response?.data?.error || "Failed to get count");
    } finally {
      setCountLoading(false);
    }
  };

  const doDownload = async () => {
    setConfirmOpen(false);
    setDownloading(true);
    try {
      const res = await API.private.downloadLeadsExport(buildFilters());
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disp = res.headers["content-disposition"] || "";
      const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disp);
      a.download = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : "leads_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      Notification.success("Export started. Your download should begin shortly.");
    } catch (err) {
      Notification.error(err?.response?.data?.error || "Failed to export leads");
    } finally {
      setDownloading(false);
    }
  };

  const resetFilters = () => {
    setStatusIds([]);
    setSourceIds([]);
    setExportCount(null);
  };

  const labelFor = (arr, id) => arr.find((o) => o.value === id)?.label || id;

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Header: title + Refresh on the right */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Heading>Export Leads</Heading>
          <div className="w-fit">
            <AccentButton
              text={countLoading ? "Counting..." : "Refresh Count"}
              onClick={manualRefresh}
              disabled={loadingLookups || countLoading}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters card */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={resetFilters}
                  className="w-fit px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Reset filters
                </button>
              </div>

              {loadingLookups ? (
                <div className="p-6">
                  <Spinner message="Loading filters..." />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MultiSelect
                      label="Statuses"
                      placeholder="Select statuses"
                      options={statuses}
                      value={statusIds}
                      onChange={(vals) => setStatusIds(vals)}
                    />
                    <MultiSelect
                      label="Sources"
                      placeholder="Select sources"
                      options={sources}
                      value={sourceIds}
                      onChange={(vals) => setSourceIds(vals)}
                    />
                  </div>

                  {/* Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase tracking-wide text-gray-500">Selected Statuses:</span>
                      {statusIds.length === 0 ? (
                        <span className="text-xs text-gray-500">None</span>
                      ) : (
                        statusIds.map((id) => (
                          <Pill key={`st-${id}`} onRemove={() => setStatusIds((s) => s.filter((x) => x !== id))}>
                            {labelFor(statuses, id)}
                          </Pill>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase tracking-wide text-gray-500">Selected Sources:</span>
                      {sourceIds.length === 0 ? (
                        <span className="text-xs text-gray-500">None</span>
                      ) : (
                        sourceIds.map((id) => (
                          <Pill key={`sr-${id}`} onRemove={() => setSourceIds((s) => s.filter((x) => x !== id))}>
                            {labelFor(sources, id)}
                          </Pill>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary card */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Summary</h3>
              </div>
              <div className="p-6 space-y-4 flex-1">
                <InfoRow
                  label="Matching leads"
                  value={countLoading ? "Counting…" : exportCount === null ? "—" : String(exportCount)}
                />
                {countError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {countError}
                  </div>
                )}
              </div>
              {/* Export button bottom-right */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  className="w-fit px-4 py-2 rounded bg-black text-white font-medium hover:bg-gray-900 transition disabled:opacity-50"
                  onClick={() => setConfirmOpen(true)}
                  disabled={loadingLookups || countLoading || exportCount === null || exportCount === 0 || downloading}
                  title={
                    loadingLookups
                      ? "Loading filters…"
                      : countLoading
                      ? "Counting…"
                      : exportCount === null
                      ? "Waiting for count…"
                      : exportCount === 0
                      ? "No leads match filters"
                      : `Export ${exportCount} leads`
                  }
                >
                  {downloading ? "Preparing…" : exportCount !== null ? `Export ${exportCount} leads` : "Export"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Confirm Export"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <button className="w-fit px-4 py-2 rounded border" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="w-fit px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                onClick={doDownload}
                disabled={downloading}
              >
                {downloading ? "Preparing…" : `Export ${exportCount ?? 0} lead${exportCount === 1 ? "" : "s"}`}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-gray-800">
            <p>
              You’re about to export <span className="font-semibold">{exportCount ?? 0}</span> lead
              {exportCount === 1 ? "" : "s"} to CSV.
            </p>
            {(statusIds.length > 0 || sourceIds.length > 0) && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Applied filters:</div>
                <div className="flex flex-wrap gap-2">
                  {statusIds.map((id) => (
                    <Pill key={`st-c-${id}`}>Status: {labelFor(statuses, id)}</Pill>
                  ))}
                  {sourceIds.map((id) => (
                    <Pill key={`sr-c-${id}`}>Source: {labelFor(sources, id)}</Pill>
                  ))}
                  {statusIds.length === 0 && sourceIds.length === 0 && (
                    <span className="text-sm text-gray-600">None</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </DefaultLayout>
  );
};

export default LeadExport;
