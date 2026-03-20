import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import IconComponent from "@/components/ui/Icon";
import AccentButton from "@/components/ui/AccentButton";
import Modal from "@/components/ui/Modal";
import TeamFormModal from "./components/TeamFormModal";

const ViewTeamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [memberOptions, setMemberOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Managers + Sales reps (needed for edit)
  const [managers, setManagers] = useState([]); // [{ value, label }]
  const [salesReps, setSalesReps] = useState([]); // [{ value, label }]

  const fetchTeam = async () => {
    try {
      const res = await API.private.getTeamById(id);
      if (res?.data?.code === "OK") {
        setTeam(res.data.data);
      } else {
        Notification.error(res?.data?.error || "Failed to fetch team");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch team");
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await API.private.getManagers();
      if (res?.data?.code === "OK") {
        setManagers(res.data.data.map((m) => ({ value: m.id, label: m.full_name })));
      } else {
        Notification.error(res?.data?.error || "Failed to fetch managers");
      }
    } catch {
      Notification.error("Failed to fetch managers");
    }
  };

  useEffect(() => {
    const seedOptions = async () => {
      try {
        const res = await API.private.getUnassignedSalesReps();
        if (res?.data?.code === "OK") {
          const unassigned = res.data.data.map((s) => ({ value: s.id, label: s.full_name }));
          setMemberOptions(unassigned);
          setSalesReps(unassigned);
        } else {
          Notification.error(res?.data?.error || "Failed to fetch sales reps");
        }
      } catch {
        Notification.error("Failed to fetch sales reps");
      }
    };
    seedOptions();
    fetchTeam();
    fetchManagers();
  }, [id]);

  // ==========================
  // Edit & Delete
  // ==========================
  const handleEditClick = () => {
    if (!team) return;

    // include current members in options (alias: members)
    const currentMemberOptions = (team.members || []).map((u) => ({ value: u.id, label: u.full_name })) || [];

    // merge with unassigned sales reps (avoid duplicates)
    const mergedMap = new Map();
    [...salesReps, ...currentMemberOptions].forEach((opt) => mergedMap.set(opt.value, opt));
    const mergedOptions = Array.from(mergedMap.values());
    setMemberOptions(mergedOptions);

    setEditingTeam({
      id: team.id,
      name: team.name,
      // managers is an array (alias: managers)
      manager_ids: (team.managers || []).map((m) => m.id),
      // members is an array (alias: members)
      members: (team.members || []).map((u) => u.id),
    });

    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data) => {
    // data: { name, manager_ids: number[], members: number[] }
    try {
      const res = await API.private.updateTeam(team.id, data);
      if (res?.data?.code === "OK") {
        Notification.success("Team updated successfully");
        setIsEditModalOpen(false);
        setEditingTeam(null);
        fetchTeam();
      } else {
        Notification.error(res?.data?.error || "Failed to update team");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to update team");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await API.private.deleteTeam(team.id);
      if (res?.data?.code === "OK") {
        Notification.success("Team deleted successfully");
        navigate("/admin/teams");
      } else {
        Notification.error(res?.data?.error || "Failed to delete team");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to delete team");
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <DefaultLayout>
        <p className="text-gray-500">Loading team details...</p>
      </DefaultLayout>
    );
  }

  if (!team) {
    return (
      <DefaultLayout>
        <p className="text-red-500">Team not found.</p>
      </DefaultLayout>
    );
  }

  // Render helpers for managers list
  const renderManagers = (mgrs = []) => {
    if (!mgrs.length) return <p className="text-sm text-gray-500">No managers</p>;
    return (
      <ul className="flex flex-wrap gap-3">
        {mgrs.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold">
              {m.full_name?.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-800 leading-tight">{m.full_name}</p>
              <p className="text-sm text-gray-500 leading-tight">{m.email}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600">
          <Link to="/admin/teams" className="hover:underline">
            Teams
          </Link>{" "}
          / <span className="font-medium">{team.name}</span>
        </div>

        {/* Header with Actions */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <IconComponent icon="mdi:account-group" width={28} className="text-indigo-600" />
            {team.name}
          </h1>

          <div className="flex gap-3">
            {/* Edit button */}
            <button
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-indigo-500 text-indigo-600 rounded-md hover:bg-indigo-50 transition"
            >
              <IconComponent icon="mdi:pencil" width={18} className="text-indigo-600" />
              Edit
            </button>

            {/* Delete button */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-500 text-red-600 rounded-md hover:bg-red-50 transition"
            >
              <IconComponent icon="mdi:delete" width={18} className="text-red-600" />
              Delete
            </button>
          </div>
        </div>

        {/* Managers Card (plural) */}
        <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-3">
            <IconComponent icon="mdi:account-tie" width={22} className="text-green-600" />
            Managers
          </h2>
          {renderManagers(team.managers)}
        </div>

        {/* Members Grid */}
        <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-4">
            <IconComponent icon="mdi:account-multiple" width={22} className="text-blue-600" />
            Members ({team.members?.length || 0})
          </h2>

          {team.members && team.members.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold mr-3">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{member.full_name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No members in this team.</p>
          )}
        </div>
      </div>

      {/* ========================== */}
      {/* Edit Modal */}
      {/* ========================== */}
      <TeamFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeam(null);
        }}
        onSubmit={handleEditSubmit}
        editingTeam={editingTeam}
        managers={managers}
        memberOptions={memberOptions}
        loading={false}
      />

      {/* ========================== */}
      {/* Delete Confirmation Modal */}
      {/* ========================== */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
        <p>
          Are you sure you want to delete <span className="font-semibold">{team?.name}</span>?
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
    </DefaultLayout>
  );
};

export default ViewTeamPage;
