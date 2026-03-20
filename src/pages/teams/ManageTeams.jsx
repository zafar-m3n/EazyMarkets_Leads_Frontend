import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Pagination from "@/components/ui/Pagination";
import Table from "@/components/ui/Table";
import IconComponent from "@/components/ui/Icon";
import Heading from "@/components/ui/Heading";
import AccentButton from "@/components/ui/AccentButton";
import TeamFormModal from "./components/TeamFormModal";
import Modal from "@/components/ui/Modal";

const ManageTeams = () => {
  const [teams, setTeams] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]); // [{ value, label }] - unassigned managers (merged during edit)
  const [salesRepOptions, setSalesRepOptions] = useState([]); // [{ value, label }] - unassigned reps (merged during edit)
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Team Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  const navigate = useNavigate();

  // ==========================
  // Fetch Functions
  // ==========================
  const fetchTeams = async (currentPage = page) => {
    try {
      const res = await API.private.getTeams(currentPage, limit);
      if (res?.data?.code === "OK") {
        setTeams(res.data.data.teams || []);
        setTotalPages(res.data.data.pages);
      } else {
        Notification.error(res?.data?.error || "Failed to fetch teams");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch teams");
    }
  };

  const fetchUnassignedManagers = async () => {
    try {
      const res = await API.private.getUnassignedManagers();
      if (res?.data?.code === "OK") {
        const unassigned = res.data.data.map((u) => ({ value: u.id, label: u.full_name }));
        setManagerOptions(unassigned);
      } else {
        Notification.error(res?.data?.error || "Failed to fetch managers");
      }
    } catch (err) {
      Notification.error("Failed to fetch managers");
    }
  };

  const fetchUnassignedSalesReps = async () => {
    try {
      const res = await API.private.getUnassignedSalesReps();
      if (res?.data?.code === "OK") {
        const unassigned = res.data.data.map((s) => ({ value: s.id, label: s.full_name }));
        setSalesRepOptions(unassigned);
      } else {
        Notification.error(res?.data?.error || "Failed to fetch sales reps");
      }
    } catch (err) {
      Notification.error("Failed to fetch sales reps");
    }
  };

  useEffect(() => {
    fetchTeams(page);
  }, [page]);

  useEffect(() => {
    // On initial mount, seed options with UNASSIGNED only (for "Add Team")
    fetchUnassignedManagers();
    fetchUnassignedSalesReps();
  }, []);

  // ==========================
  // CRUD Handlers
  // ==========================
  const handleSubmit = async (data) => {
    // data from modal: { name, manager_ids: number[], members: number[] }
    setLoading(true);
    try {
      if (editingTeam) {
        const res = await API.private.updateTeam(editingTeam.id, data);
        if (res?.data?.code === "OK") {
          Notification.success("Team updated successfully");
        } else {
          Notification.error(res?.data?.error || "Failed to update team");
          return;
        }
      } else {
        const res = await API.private.createTeam(data);
        if (res?.data?.code === "OK") {
          Notification.success("Team created successfully");
        } else {
          Notification.error(res?.data?.error || "Failed to create team");
          return;
        }
      }
      await fetchTeams();
      // After changes, refresh UNASSIGNED lists
      await fetchUnassignedManagers();
      await fetchUnassignedSalesReps();
      setIsModalOpen(false);
      setEditingTeam(null);
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to save team");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (team) => {
    try {
      const res = await API.private.getTeamById(team.id);
      if (res?.data?.code !== "OK") {
        Notification.error(res?.data?.error || "Failed to fetch team details");
        return;
      }
      const teamData = res.data.data;

      // ===== Merge managers: unassigned + current team managers =====
      const currentManagers = (teamData.managers || []).map((m) => ({ value: m.id, label: m.full_name }));
      const mgrMap = new Map();
      [...managerOptions, ...currentManagers].forEach((opt) => mgrMap.set(opt.value, opt));
      const mergedManagerOptions = Array.from(mgrMap.values());

      // ===== Merge members: unassigned + current team members =====
      const currentMembers = (teamData.members || []).map((u) => ({ value: u.id, label: u.full_name }));
      const memMap = new Map();
      [...salesRepOptions, ...currentMembers].forEach((opt) => memMap.set(opt.value, opt));
      const mergedMemberOptions = Array.from(memMap.values());

      setManagerOptions(mergedManagerOptions);
      setSalesRepOptions(mergedMemberOptions);

      setEditingTeam({
        id: teamData.id,
        name: teamData.name,
        manager_ids: (teamData.managers || []).map((m) => m.id),
        members: (teamData.members || []).map((u) => u.id),
      });

      setIsModalOpen(true);
    } catch (err) {
      Notification.error("Failed to fetch team details");
    }
  };

  const confirmDelete = (team) => {
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;
    try {
      const res = await API.private.deleteTeam(teamToDelete.id);
      if (res?.data?.code === "OK") {
        Notification.success("Team deleted successfully");
        await fetchTeams();
        // Refresh unassigned pools too
        await fetchUnassignedManagers();
        await fetchUnassignedSalesReps();
      } else {
        Notification.error(res?.data?.error || "Failed to delete team");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to delete team");
    } finally {
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
    }
  };

  const handleView = (team) => {
    navigate(`/admin/teams/${team.id}`);
  };

  // ==========================
  // Table Columns
  // ==========================
  const columns = [
    { key: "name", label: "Team Name" },
    { key: "managers", label: "Managers" },
    { key: "members", label: "Members" },
    { key: "actions", label: "Actions" },
  ];

  const renderManagersCell = (row) => {
    const mgrs = row.managers || [];
    if (mgrs.length === 0) return "-";

    return (
      <div className="flex flex-wrap gap-2">
        {mgrs.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
            title={m.email}
          >
            <IconComponent icon="mdi:account-tie" width={14} className="text-green-600" />
            {m.full_name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Heading + Add Button */}
        <div className="flex justify-between items-center">
          <Heading>Manage Teams</Heading>
          <div className="w-fit">
            <AccentButton
              text="Add Team"
              onClick={() => {
                // For "Add": ensure options are ONLY unassigned pools
                Promise.all([fetchUnassignedManagers(), fetchUnassignedSalesReps()]).finally(() => {
                  setEditingTeam(null);
                  setIsModalOpen(true);
                });
              }}
            />
          </div>
        </div>

        {/* Teams Table */}
        <Table
          columns={columns}
          data={teams}
          emptyMessage="No teams found."
          renderCell={(row, col) => {
            switch (col.key) {
              case "managers":
                return renderManagersCell(row);
              case "members":
                return row.members?.length || 0;
              case "actions":
                return (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(row)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      title="View"
                    >
                      <IconComponent icon="mdi:eye" width={20} className="text-gray-800" />
                    </button>
                    <button
                      onClick={() => handleEdit(row)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      title="Edit"
                    >
                      <IconComponent icon="mdi:pencil" width={20} className="text-gray-800" />
                    </button>
                    <button
                      onClick={() => confirmDelete(row)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      title="Delete"
                    >
                      <IconComponent icon="mdi:delete" width={20} className="text-gray-800" />
                    </button>
                  </div>
                );
              default:
                return row[col.key] || "-";
            }
          }}
        />

        {totalPages >= 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} className="mt-4" />
        )}

        {/* Form Modal */}
        <TeamFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTeam(null);
            // Reset options back to UNASSIGNED pools so a subsequent "Add" starts clean
            fetchUnassignedManagers();
            fetchUnassignedSalesReps();
          }}
          onSubmit={handleSubmit}
          editingTeam={editingTeam}
          managers={managerOptions}
          memberOptions={salesRepOptions}
          loading={loading}
        />

        {/* Delete Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          size="sm"
        >
          <p>
            Are you sure you want to delete <span className="font-semibold">{teamToDelete?.name}</span>?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setIsDeleteModalOpen(false)} className="text-sm px-4 py-1.5 rounded bg-gray-300">
              Cancel
            </button>
            <button onClick={handleDelete} className="text-sm px-4 py-1.5 rounded bg-red-500 text-white">
              Delete
            </button>
          </div>
        </Modal>
      </div>
    </DefaultLayout>
  );
};

export default ManageTeams;
