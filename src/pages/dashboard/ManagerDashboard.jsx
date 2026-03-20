import React, { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Heading from "@/components/ui/Heading";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { getStatusColor, getSourceColor } from "@/utils/leadColors";

import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#A3E635", "#FB7185"];

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);          // { self_leads, team_leads, leads_by_member[], recent_team_leads[] }
  const [myAssignments, setMyAssignments] = useState([]); // assignments[]

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await API.private.getManagerDashboardSummary({ recentLimit: 5 });
      console.log("[ManagerDashboard] getManagerDashboardSummary (raw):", res);
      const code = res?.data?.code;
      const payload = res?.data?.data;
      if (code === "OK" && payload) {
        setSummary(payload);
      } else {
        Notification.error(res?.data?.error || "Failed to load manager dashboard");
      }
    } catch (err) {
      console.error("[ManagerDashboard] getManagerDashboardSummary error:", err);
      Notification.error(err?.response?.data?.error || "Failed to load manager dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await API.private.getMyDashboardAssignments({ recentLimit: 5 });
      console.log("[ManagerDashboard] getMyDashboardAssignments (raw):", res);
      const code = res?.data?.code;
      const payload = res?.data?.data;
      if (code === "OK" && Array.isArray(payload)) {
        setMyAssignments(payload);
      } else {
        Notification.error(res?.data?.error || "Failed to load your assignments");
      }
    } catch (err) {
      console.error("[ManagerDashboard] getMyDashboardAssignments error:", err);
      Notification.error(err?.response?.data?.error || "Failed to load your assignments");
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchAssignments();
  }, []);

  // ------- Data shaping -------
  const leadsByMemberData = useMemo(() => {
    if (!summary?.leads_by_member) return [];
    return summary.leads_by_member.map((row, idx) => ({
      name: row?.assignee?.full_name || `User #${row?.assignee_id ?? idx + 1}`,
      count: Number(row?.count || 0),
      assignee_id: row?.assignee_id,
      email: row?.assignee?.email || "",
    }));
  }, [summary]);

  const recentTeamLeads = summary?.recent_team_leads || [];

  // ------- Tables -------
  const recentLeadsColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "created_at", label: "Created" },
  ];

  const myAssignmentsColumns = [
    { key: "lead_name", label: "Lead" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "assigned_at", label: "Assigned" },
  ];

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div className="flex justify-between items-center">
          <Heading>Manager Dashboard</Heading>
        </div>

        {/* KPI Cards (Manager-focused) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-sm text-gray-500">Self Leads</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? "—" : summary?.self_leads ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-sm text-gray-500">Team Leads</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? "—" : summary?.team_leads ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-sm text-gray-500">Team Members</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? "—" : (summary?.leads_by_member?.length ?? 0)}
            </div>
          </div>
        </div>

        {/* Leads by Member (Bar) */}
        <section className="rounded-xl border border-gray-200 p-5 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads by Team Member</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsByMemberData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Team Leads */}
        <section className="rounded-xl border border-gray-200 p-5 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Team Leads (5)</h2>
          <Table
            columns={recentLeadsColumns}
            data={recentTeamLeads.map((l) => ({
              id: l.id,
              name: [l.first_name, l.last_name].filter(Boolean).join(" ") || "-",
              email: l.email || "-",
              company: l.company || "-",
              status: l?.LeadStatus?.value || l?.LeadStatus?.label || "-",
              source: l?.LeadSource?.value || l?.LeadSource?.label || "-",
              created_at: l.created_at,
            }))}
            emptyMessage={loading ? "Loading..." : "No recent team leads found."}
            renderCell={(row, col) => {
              switch (col.key) {
                case "status":
                  return (
                    <Badge text={row.status} color={getStatusColor(row.status)} size="sm" rounded="rounded" />
                  );
                case "source":
                  return (
                    <Badge text={row.source} color={getSourceColor(row.source)} size="sm" rounded="rounded" />
                  );
                case "created_at":
                  return row.created_at ? new Date(row.created_at).toLocaleString() : "-";
                default:
                  return row[col.key] || "-";
              }
            }}
          />
        </section>

        {/* My Recent Assignments */}
        <section className="rounded-xl border border-gray-200 p-5 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Recent Assignments (5)</h2>
          <Table
            columns={myAssignmentsColumns}
            data={myAssignments.slice(0, 5).map((a) => ({
              id: a.id,
              lead_name: [a?.Lead?.first_name, a?.Lead?.last_name].filter(Boolean).join(" ") || "-",
              email: a?.Lead?.email || "-",
              company: a?.Lead?.company || "-",
              status:
                a?.Lead?.LeadStatus?.value ||
                a?.Lead?.LeadStatus?.label ||
                "-",
              source:
                a?.Lead?.LeadSource?.value ||
                a?.Lead?.LeadSource?.label ||
                "-",
              assigned_at: a.assigned_at,
            }))}
            emptyMessage={"No recent assignments found."}
            renderCell={(row, col) => {
              switch (col.key) {
                case "status":
                  return <Badge text={row.status} color={getStatusColor(row.status)} size="sm" rounded="rounded" />;
                case "source":
                  return <Badge text={row.source} color={getSourceColor(row.source)} size="sm" rounded="rounded" />;
                case "assigned_at":
                  return row.assigned_at ? new Date(row.assigned_at).toLocaleString() : "-";
                default:
                  return row[col.key] || "-";
              }
            }}
          />
        </section>
      </div>
    </DefaultLayout>
  );
};

export default ManagerDashboard;
