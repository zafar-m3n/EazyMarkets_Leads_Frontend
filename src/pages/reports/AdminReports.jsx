import React, { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Select from "@/components/form/Select";
import Table from "@/components/ui/Table";

const FIRST_YEAR = 2025;
const LAST_YEAR = 2035;

const AdminReports = () => {
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);

  // ---------- Dropdown options ----------
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
      value: String(index + 1), // "1".."12"
      label: name,
    }));
  }, []);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedYear || !selectedMonth) return "";
    const month = monthOptions.find((m) => m.value === selectedMonth);
    return month ? `${month.label} ${selectedYear}` : `${selectedMonth}/${selectedYear}`;
  }, [selectedYear, selectedMonth, monthOptions]);

  // ---------- Set initial year/month (current date, clamped) ----------
  useEffect(() => {
    if (selectedYear && selectedMonth) return;

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (year < FIRST_YEAR) {
      year = FIRST_YEAR;
      month = 1;
    } else if (year > LAST_YEAR) {
      year = LAST_YEAR;
      month = 12;
    }

    setSelectedYear(String(year));
    setSelectedMonth(String(month));
  }, [selectedYear, selectedMonth]);

  // ---------- Fetch monthly reports whenever year/month changes ----------
  useEffect(() => {
    const fetchReports = async () => {
      if (!selectedYear || !selectedMonth) return;

      const year = parseInt(selectedYear, 10);
      const month = parseInt(selectedMonth, 10);

      setLoading(true);
      setError("");
      setReportData(null);

      try {
        const response = await API.private.getMonthlyReports({ year, month });

        if (response?.data?.code === "OK") {
          setReportData(response.data.data);
        } else {
          setError("Failed to load reports for the selected period.");
        }
      } catch (err) {
        console.error("Error fetching monthly reports:", err);
        setError("Something went wrong while loading reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedYear, selectedMonth]);

  // ---------- Safely unwrap data ----------
  const callStats = reportData?.cards?.callStatistics || {
    totalCalls: 0,
    byAgent: [],
  };

  const callsBySource = reportData?.cards?.callsBySource || [];

  const salesFromCalls = reportData?.cards?.salesFromCalls || {
    totalCustomers: 0,
    bySource: [],
  };

  const monthlyPerformance = reportData?.cards?.monthlyPerformance || {
    statuses: [],
    sources: [],
    agents: [],
  };

  const agents = Array.isArray(monthlyPerformance.agents) ? monthlyPerformance.agents : [];

  // ---------- Helpers for monthlyPerformance ----------
  const getAgentTotalLeads = (agent) => {
    if (!agent || !Array.isArray(agent.status_counts)) return 0;
    return agent.status_counts.reduce((sum, status) => sum + (Number(status.count) || 0), 0);
  };

  const getAgentCustomers = (agent) => {
    if (!agent || !Array.isArray(agent.status_counts)) return 0;
    const customer = agent.status_counts.find((s) => s.status_value === "customer" || s.status_id === 1000);
    return customer ? Number(customer.count) || 0 : 0;
  };

  // Totals from monthlyPerformance
  const totalCallsFromPerformance = agents.reduce((sum, agent) => sum + (Number(agent.calls_this_month) || 0), 0);

  const totalCustomersFromPerformance = agents.reduce((sum, agent) => sum + getAgentCustomers(agent), 0);

  // Final totals that power the summary cards
  const totalCalls = totalCallsFromPerformance || callStats.totalCalls || 0;
  const totalCustomers = salesFromCalls.totalCustomers || totalCustomersFromPerformance || 0;

  const activeAgentsCount = agents.filter((agent) => Number(agent.calls_this_month) > 0).length;

  const totalCallsFromSources = callsBySource.reduce((sum, src) => sum + (Number(src.call_count) || 0), 0);

  // ---------- Status columns (hide all-zero statuses) ----------
  const nonZeroStatusColumns = (monthlyPerformance.statuses || [])
    .filter((status) => status.value !== "customer" && status.id !== 1000) // keep customer out of dynamic cols
    .filter((status) => {
      // keep only statuses where at least one agent has a non-zero count
      const hasNonZero = agents.some((agent) => {
        const entry = agent.status_counts && agent.status_counts.find((s) => s.status_id === status.id);
        return entry && Number(entry.count) > 0;
      });
      return hasNonZero;
    })
    .map((status) => ({
      key: `status_${status.value}`,
      label: status.label,
    }));

  const agentColumns = [
    { key: "full_name", label: "Agent" }, // Name + email stacked
    { key: "total_calls", label: "Calls (this month)" },
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

      case "total_calls": {
        const calls = Number(row.calls_this_month) || 0;
        return calls;
      }

      case "customers": {
        const customers = getAgentCustomers(row);
        return customers;
      }

      case "conversion_rate": {
        const calls = Number(row.calls_this_month) || 0;
        const rate = Number(row.conversion_rate) || 0;
        if (!calls || !rate) return "-";
        const pct = (rate * 100).toFixed(1);
        return `${pct}%`;
      }

      default: {
        // Handle dynamic status columns: status_<status_value>
        if (col.key.startsWith("status_")) {
          const statusValue = col.key.replace("status_", "");
          const statusEntry = row.status_counts && row.status_counts.find((s) => s.status_value === statusValue);
          return statusEntry ? Number(statusEntry.count) || 0 : 0;
        }

        return row[col.key];
      }
    }
  };

  // ---------- Source columns (hide all-zero sources) ----------
  const nonZeroSourceColumns = (monthlyPerformance.sources || [])
    .filter((src) => {
      // keep only sources where at least one agent has a non-zero count
      const hasNonZero = agents.some((agent) => {
        const entry = agent.source_counts && agent.source_counts.find((s) => Number(s.source_id) === src.id);
        return entry && Number(entry.count) > 0;
      });
      return hasNonZero;
    })
    .map((src) => ({
      key: `source_${src.id}`,
      label: src.label || src.value || `Source ${src.id}`,
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
      const sourceIdStr = col.key.replace("source_", "");
      const sourceId = Number(sourceIdStr);
      const entry = row.source_counts && row.source_counts.find((s) => Number(s.source_id) === sourceId);
      return entry ? Number(entry.count) || 0 : 0;
    }

    return row[col.key];
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Reports</h1>
            <p className="text-gray-600 mt-2">Monthly call activity and sales from calls, based on call notes.</p>
            {selectedMonthLabel && (
              <p className="text-xs text-gray-500 mt-1">
                Reporting period: <span className="font-medium">{selectedMonthLabel}</span>
              </p>
            )}
          </div>

          <div className="w-full sm:w-[420px] flex gap-3">
            <div className="flex-1">
              <Select
                label="Year"
                value={selectedYear}
                onChange={setSelectedYear}
                options={yearOptions}
                placeholder="Select year"
              />
            </div>
            <div className="flex-1">
              <Select
                label="Month"
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={monthOptions}
                placeholder="Select month"
              />
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-sm text-gray-600">Loading reports for {selectedMonthLabel || "selected period"}…</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-md px-4 py-2">{error}</div>
        )}

        {/* Main content */}
        {!loading && !error && reportData && (
          <>
            {/* 3 summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Card 1: Call Statistics */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Call Statistics</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCalls}</p>
                <p className="mt-1 text-xs text-gray-500">Total calls made this month</p>
                <p className="mt-3 text-xs text-gray-500">
                  Active agents: <span className="font-semibold text-gray-700">{activeAgentsCount}</span>
                </p>
              </div>

              {/* Card 2: Calls by Source */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Calls by Source</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCallsFromSources}</p>
                <p className="mt-1 text-xs text-gray-500">Calls with a tracked source</p>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {callsBySource.length === 0 && (
                    <p className="text-xs text-gray-400">No source data for this month.</p>
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

              {/* Card 3: Sales from Calls */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sales from Calls</h2>
                <p className="mt-3 text-3xl font-bold text-gray-900">{totalCustomers}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Leads converted to <span className="font-semibold">Customer</span> this month
                </p>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {(!salesFromCalls.bySource || salesFromCalls.bySource.length === 0) && (
                    <p className="text-xs text-gray-400">No customers from calls for this month yet.</p>
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

            {/* Big Monthly Agent Performance Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Monthly Agent Performance</h2>
                  <p className="text-xs text-gray-500">
                    Calls recorded via notes for {selectedMonthLabel || "this month"}.
                  </p>
                </div>
              </div>

              {/* horizontal scroll wrapper */}
              <div className="mt-4 overflow-x-auto">
                <Table
                  columns={agentColumns}
                  data={agents}
                  renderCell={renderAgentCell}
                  emptyMessage="No agent call activity recorded for this month."
                />
              </div>
            </div>

            {/* Agent × Source Breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Agent Source Breakdown</h2>
                  <p className="text-xs text-gray-500">
                    Number of leads per source, based on latest assignments in {selectedMonthLabel || "this month"}.
                  </p>
                </div>
              </div>

              {/* horizontal scroll wrapper */}
              <div className="mt-4 overflow-x-auto">
                <Table
                  columns={agentSourceColumns}
                  data={agents}
                  renderCell={renderAgentSourceCell}
                  emptyMessage="No source-based assignment data for this month."
                />
              </div>
            </div>
          </>
        )}

        {/* No data but also no explicit error */}
        {!loading && !error && !reportData && (
          <p className="text-sm text-gray-500">No report data available for the selected period.</p>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AdminReports;
