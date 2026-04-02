import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Select from "@/components/form/Select";
import Table from "@/components/ui/Table";
import IconComponent from "@/components/ui/Icon";

const FIRST_YEAR = 2025;
const LAST_YEAR = 2035;

const REPORT_TYPES = {
  MONTHLY: "monthly",
  DAILY: "daily",
  CUSTOM_RANGE: "custom_range",
};

const today = new Date();
const MIN_DATE = new Date("2020-01-01");
const MAX_DATE = new Date(today.getFullYear(), today.getMonth(), today.getDate());

const toISODate = (d) => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
};

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
        className="w-full bg-white border rounded px-3 py-2 text-left text-sm text-gray-800 placeholder-gray-600 focus:outline-none focus:border-accent transition border-gray-300 flex items-center justify-between"
      >
        <span className={value ? "" : "text-gray-400"}>{value ? formatDisplayDate(value) : "Select date"}</span>
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

const AdminReports = () => {
  const now = new Date();
  const currentToday = toISODate(now);

  const [reportType, setReportType] = useState(REPORT_TYPES.MONTHLY);
  const [selectedYear, setSelectedYear] = useState(() => {
    let year = now.getFullYear();
    if (year < FIRST_YEAR) year = FIRST_YEAR;
    if (year > LAST_YEAR) year = LAST_YEAR;
    return String(year);
  });
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDate, setSelectedDate] = useState(currentToday);
  const [fromDate, setFromDate] = useState(currentToday);
  const [toDate, setToDate] = useState(currentToday);
  const [selectedAgentId, setSelectedAgentId] = useState("all");

  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState("");
  const [agentOptions, setAgentOptions] = useState([{ value: "all", label: "All Agents" }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const reportTypeOptions = useMemo(
    () => [
      { value: REPORT_TYPES.MONTHLY, label: "Monthly" },
      { value: REPORT_TYPES.DAILY, label: "Daily" },
      { value: REPORT_TYPES.CUSTOM_RANGE, label: "Custom Range" },
    ],
    [],
  );

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return monthNames.map((name, index) => ({
      value: String(index + 1),
      label: name,
    }));
  }, []);

  useEffect(() => {
    const fetchReportAgents = async () => {
      setAgentsLoading(true);
      setAgentsError("");

      try {
        const response = await API.private.getReportAgents();

        if (response?.data?.code === "OK") {
          const agents = Array.isArray(response?.data?.data?.agents) ? response.data.data.agents : [];

          const mappedOptions = [
            { value: "all", label: "All Agents" },
            ...agents.map((agent) => ({
              value: String(agent.id),
              label: agent.full_name || agent.email || `Agent ${agent.id}`,
            })),
          ];

          setAgentOptions(mappedOptions);
        } else {
          setAgentsError("Failed to load agents.");
        }
      } catch (err) {
        console.error("Error fetching report agents:", err);
        setAgentsError("Something went wrong while loading agents.");
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchReportAgents();
  }, []);

  const selectedAgentLabel = useMemo(() => {
    const found = agentOptions.find((option) => option.value === selectedAgentId);
    return found ? found.label : "All Agents";
  }, [agentOptions, selectedAgentId]);

  const currentPeriodPreview = useMemo(() => {
    if (reportType === REPORT_TYPES.MONTHLY) {
      const month = monthOptions.find((item) => item.value === selectedMonth);
      return month ? `${month.label} ${selectedYear}` : "";
    }

    if (reportType === REPORT_TYPES.DAILY) {
      return selectedDate ? formatDisplayDate(selectedDate) : "";
    }

    if (reportType === REPORT_TYPES.CUSTOM_RANGE) {
      if (!fromDate || !toDate) return "";
      return `${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`;
    }

    return "";
  }, [reportType, selectedYear, selectedMonth, selectedDate, fromDate, toDate, monthOptions]);

  const isMonthlyValid = Boolean(selectedYear && selectedMonth);
  const isDailyValid = Boolean(selectedDate);
  const isCustomRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);

  const canGenerate =
    !loading &&
    !agentsLoading &&
    !agentsError &&
    ((reportType === REPORT_TYPES.MONTHLY && isMonthlyValid) ||
      (reportType === REPORT_TYPES.DAILY && isDailyValid) ||
      (reportType === REPORT_TYPES.CUSTOM_RANGE && isCustomRangeValid));

  const buildReportParams = () => {
    const params = {
      report_type: reportType,
      agent_id: selectedAgentId || "all",
    };

    if (reportType === REPORT_TYPES.MONTHLY) {
      params.year = parseInt(selectedYear, 10);
      params.month = parseInt(selectedMonth, 10);
    }

    if (reportType === REPORT_TYPES.DAILY) {
      params.date = selectedDate;
    }

    if (reportType === REPORT_TYPES.CUSTOM_RANGE) {
      params.from_date = fromDate;
      params.to_date = toDate;
    }

    return params;
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) return;

    setLoading(true);
    setError("");
    setReportData(null);
    setHasGenerated(true);

    try {
      const response = await API.private.getReports(buildReportParams());

      if (response?.data?.code === "OK") {
        setReportData(response.data.data);
      } else {
        setError("Failed to load reports for the selected filters.");
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Something went wrong while loading reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    const resetNow = new Date();
    let resetYear = resetNow.getFullYear();
    if (resetYear < FIRST_YEAR) resetYear = FIRST_YEAR;
    if (resetYear > LAST_YEAR) resetYear = LAST_YEAR;

    const resetToday = toISODate(resetNow);

    setReportType(REPORT_TYPES.MONTHLY);
    setSelectedYear(String(resetYear));
    setSelectedMonth(String(resetNow.getMonth() + 1));
    setSelectedDate(resetToday);
    setFromDate(resetToday);
    setToDate(resetToday);
    setSelectedAgentId("all");

    setLoading(false);
    setError("");
    setReportData(null);
    setHasGenerated(false);
  };

  const callStats = reportData?.cards?.callStatistics || {
    totalCalls: 0,
    byAgent: [],
  };

  const callsBySource = reportData?.cards?.callsBySource || [];

  const salesFromCalls = reportData?.cards?.salesFromCalls || {
    totalCustomers: 0,
    bySource: [],
  };

  const agentPerformance = reportData?.cards?.agentPerformance ||
    reportData?.cards?.monthlyPerformance || {
      statuses: [],
      sources: [],
      agents: [],
    };

  const agents = Array.isArray(agentPerformance.agents) ? agentPerformance.agents : [];

  const getAgentCustomers = (agent) => {
    if (!agent || !Array.isArray(agent.status_counts)) return 0;

    const customer = agent.status_counts.find(
      (status) => String(status.status_value || "").toLowerCase() === "customer",
    );

    return customer ? Number(customer.count) || 0 : 0;
  };

  const totalCallsFromPerformance = agents.reduce(
    (sum, agent) => sum + (Number(agent.calls_this_period) || Number(agent.calls_this_month) || 0),
    0,
  );

  const totalCustomersFromPerformance = agents.reduce((sum, agent) => sum + getAgentCustomers(agent), 0);

  const totalCalls = totalCallsFromPerformance || callStats.totalCalls || 0;
  const totalCustomers = salesFromCalls.totalCustomers || totalCustomersFromPerformance || 0;

  const activeAgentsCount = agents.filter(
    (agent) => Number(agent.calls_this_period) > 0 || Number(agent.calls_this_month) > 0,
  ).length;

  const totalCallsFromSources = callsBySource.reduce((sum, src) => sum + (Number(src.call_count) || 0), 0);

  const nonZeroStatusColumns = (agentPerformance.statuses || [])
    .filter((status) => String(status.value || "").toLowerCase() !== "customer")
    .filter((status) =>
      agents.some((agent) => {
        const entry = agent.status_counts?.find((item) => item.status_id === status.id);
        return entry && Number(entry.count) > 0;
      }),
    )
    .map((status) => ({
      key: `status_${status.value}`,
      label: status.label,
    }));

  const agentColumns = [
    { key: "full_name", label: "Agent" },
    { key: "total_calls", label: "Calls" },
    { key: "customers", label: "Customers" },
    { key: "conversion_rate", label: "Conversion Rate" },
    ...nonZeroStatusColumns,
  ];

  const renderAgentCell = (row, col) => {
    if (!row) return null;

    switch (col.key) {
      case "full_name": {
        const name = row.full_name || "Unknown User";
        const email = row.email || "-";

        return (
          <div className="flex flex-col overflow-hidden text-left">
            <span className="font-medium text-gray-900 truncate">{name}</span>
            <span className="text-xs text-gray-600 truncate">{email}</span>
          </div>
        );
      }

      case "total_calls":
        return Number(row.calls_this_period) || Number(row.calls_this_month) || 0;

      case "customers":
        return getAgentCustomers(row);

      case "conversion_rate": {
        const calls = Number(row.calls_this_period) || Number(row.calls_this_month) || 0;
        const rate = Number(row.conversion_rate) || 0;

        if (!calls || !rate) return "-";
        return `${(rate * 100).toFixed(1)}%`;
      }

      default: {
        if (col.key.startsWith("status_")) {
          const statusValue = col.key.replace("status_", "");
          const statusEntry = row.status_counts?.find((status) => status.status_value === statusValue);
          return statusEntry ? Number(statusEntry.count) || 0 : 0;
        }

        return row[col.key];
      }
    }
  };

  const nonZeroSourceColumns = (agentPerformance.sources || [])
    .filter((source) =>
      agents.some((agent) => {
        const entry = agent.source_counts?.find((item) => Number(item.source_id) === source.id);
        return entry && Number(entry.count) > 0;
      }),
    )
    .map((source) => ({
      key: `source_${source.id}`,
      label: source.label || source.value || `Source ${source.id}`,
    }));

  const agentSourceColumns = [{ key: "full_name", label: "Agent" }, ...nonZeroSourceColumns];

  const renderAgentSourceCell = (row, col) => {
    if (!row) return null;

    if (col.key === "full_name") {
      const name = row.full_name || "Unknown User";
      const email = row.email || "-";

      return (
        <div className="flex flex-col overflow-hidden text-left">
          <span className="font-medium text-gray-900 truncate">{name}</span>
          <span className="text-xs text-gray-600 truncate">{email}</span>
        </div>
      );
    }

    if (col.key.startsWith("source_")) {
      const sourceId = Number(col.key.replace("source_", ""));
      const entry = row.source_counts?.find((source) => Number(source.source_id) === sourceId);
      return entry ? Number(entry.count) || 0 : 0;
    }

    return row[col.key];
  };

  const periodLabelRaw = reportData?.period?.label || currentPeriodPreview;
  const periodLabel =
    reportData?.period?.report_type === REPORT_TYPES.DAILY && reportData?.period?.date
      ? formatDisplayDate(reportData.period.date)
      : reportData?.period?.report_type === REPORT_TYPES.CUSTOM_RANGE &&
          reportData?.period?.from_date &&
          reportData?.period?.to_date
        ? `${formatDisplayDate(reportData.period.from_date)} to ${formatDisplayDate(reportData.period.to_date)}`
        : periodLabelRaw;

  const performanceTitle =
    reportType === REPORT_TYPES.MONTHLY
      ? "Monthly Agent Performance"
      : reportType === REPORT_TYPES.DAILY
        ? "Daily Agent Performance"
        : "Agent Performance";

  const performanceEmptyMessage =
    reportType === REPORT_TYPES.MONTHLY
      ? "No agent activity recorded for this month."
      : reportType === REPORT_TYPES.DAILY
        ? "No agent activity recorded for this day."
        : "No agent activity recorded for this period.";

  const sourceBreakdownEmptyMessage =
    reportType === REPORT_TYPES.MONTHLY
      ? "No source-based assignment data for this month."
      : reportType === REPORT_TYPES.DAILY
        ? "No source-based assignment data for this day."
        : "No source-based assignment data for this period.";

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600">
            View call activity, source breakdowns, conversions, and agent performance by selected report type.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Select
                label="Report Type"
                value={reportType}
                onChange={setReportType}
                options={reportTypeOptions}
                placeholder="Select report type"
              />
            </div>

            {reportType === REPORT_TYPES.MONTHLY && (
              <>
                <div>
                  <Select
                    label="Year"
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={yearOptions}
                    placeholder="Select year"
                  />
                </div>

                <div>
                  <Select
                    label="Month"
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    options={monthOptions}
                    placeholder="Select month"
                  />
                </div>
              </>
            )}

            {reportType === REPORT_TYPES.DAILY && (
              <DatePopover
                label="Date"
                value={selectedDate}
                onChangeISO={setSelectedDate}
                minDate={MIN_DATE}
                maxDate={MAX_DATE}
              />
            )}

            {reportType === REPORT_TYPES.CUSTOM_RANGE && (
              <>
                <DatePopover
                  label="From Date"
                  value={fromDate}
                  onChangeISO={setFromDate}
                  minDate={MIN_DATE}
                  maxDate={MAX_DATE}
                  clampMaxTo={toDate}
                />

                <DatePopover
                  label="To Date"
                  value={toDate}
                  onChangeISO={setToDate}
                  minDate={MIN_DATE}
                  maxDate={MAX_DATE}
                  clampMinTo={fromDate}
                />
              </>
            )}

            <div>
              <Select
                label="Agent"
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                options={agentOptions}
                placeholder={agentsLoading ? "Loading agents..." : "Select agent"}
                disabled={agentsLoading || !!agentsError}
              />
            </div>
          </div>

          {reportType === REPORT_TYPES.CUSTOM_RANGE && fromDate && toDate && fromDate > toDate && (
            <p className="mt-3 text-sm text-red-500">From Date cannot be after To Date.</p>
          )}

          {agentsError && <p className="mt-3 text-sm text-red-500">{agentsError}</p>}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500">
              {currentPeriodPreview ? (
                <>
                  Selected period: <span className="font-medium text-gray-700">{currentPeriodPreview}</span>
                  <span className="mx-2">•</span>
                  Agent: <span className="font-medium text-gray-700">{selectedAgentLabel}</span>
                </>
              ) : (
                "Choose your filters, then generate the report."
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center rounded-md bg-[#7ed957] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            Loading report for {currentPeriodPreview || "selected period"}...
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        {!loading && !error && !hasGenerated && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-sm text-gray-500">
            Select a report type, choose your filters, and click <span className="font-medium">Generate Report</span>.
          </div>
        )}

        {!loading && !error && hasGenerated && !reportData && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-sm text-gray-500">
            No report data available for the selected period.
          </div>
        )}

        {!loading && !error && reportData && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Summary</h2>
                <p className="text-sm text-gray-600">
                  Period: <span className="font-medium text-gray-800">{periodLabel || "-"}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Agent: <span className="font-medium text-gray-800">{selectedAgentLabel}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Call Statistics</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCalls}</p>
                <p className="mt-1 text-xs text-gray-500">Total calls recorded in the selected period</p>
                <p className="mt-3 text-xs text-gray-500">
                  Active agents: <span className="font-semibold text-gray-700">{activeAgentsCount}</span>
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Calls by Source</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCallsFromSources}</p>
                <p className="mt-1 text-xs text-gray-500">Calls with a tracked source</p>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {callsBySource.length === 0 && (
                    <p className="text-xs text-gray-400">No source data for this period.</p>
                  )}

                  {callsBySource.map((src) => {
                    const count = Number(src.call_count) || 0;
                    const pct = totalCallsFromSources > 0 ? ((count / totalCallsFromSources) * 100).toFixed(1) : null;

                    return (
                      <div key={src.source_id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{src.label || src.value || "Unknown"}</span>
                        <span className="text-gray-900 font-semibold">
                          {count}
                          {pct !== null && <span className="ml-1 text-[0.7rem] text-gray-500">({pct}%)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sales from Calls</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCustomers}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Leads converted to <span className="font-semibold">Customer</span> in the selected period
                </p>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {(!salesFromCalls.bySource || salesFromCalls.bySource.length === 0) && (
                    <p className="text-xs text-gray-400">No customers from calls for this period yet.</p>
                  )}

                  {salesFromCalls.bySource?.map((src) => {
                    const count = Number(src.count) || 0;
                    const pct = totalCustomers > 0 ? ((count / totalCustomers) * 100).toFixed(1) : null;

                    return (
                      <div key={src.source_id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{src.label || src.value || "Unknown"}</span>
                        <span className="text-gray-900 font-semibold">
                          {count}
                          {pct !== null && <span className="ml-1 text-[0.7rem] text-gray-500">({pct}%)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{performanceTitle}</h2>
                  <p className="text-xs text-gray-500">
                    Calls recorded via notes for {periodLabel || "selected period"}.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <Table
                  columns={agentColumns}
                  data={agents}
                  renderCell={renderAgentCell}
                  emptyMessage={performanceEmptyMessage}
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Agent Source Breakdown</h2>
                  <p className="text-xs text-gray-500">
                    Number of leads per source, based on latest assignments in {periodLabel || "selected period"}.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <Table
                  columns={agentSourceColumns}
                  data={agents}
                  renderCell={renderAgentSourceCell}
                  emptyMessage={sourceBreakdownEmptyMessage}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AdminReports;
