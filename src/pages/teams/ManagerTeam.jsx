// src/pages/manager/ManagerTeam.jsx
import React, { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import IconComponent from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";

const ManagerTeam = () => {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  // remove-member modal
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const fetchMyTeam = async () => {
    try {
      setLoading(true);
      const res = await API.private.getMyTeam();
      if (res?.data?.code === "OK") {
        setTeam(res.data.data || null);
      } else {
        Notification.error(res?.data?.error || "Failed to fetch your team");
        setTeam(null);
      }
    } catch (err) {
      Notification.error(err?.response?.data?.error || "Failed to fetch your team");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTeam();
  }, []);

  const members = useMemo(() => {
    const list = team?.members || [];
    return [...list].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [team]);

  const confirmRemove = (member) => {
    setMemberToRemove(member);
    setIsRemoveModalOpen(true);
  };

  const handleRemove = async () => {
    if (!memberToRemove?.id) return;
    try {
      const res = await API.private.removeMemberFromMyTeam(memberToRemove.id);
      if (res?.data?.code === "OK") {
        Notification.success("Member removed");
        // Optimistic update
        setTeam((t) => ({
          ...t,
          members: (t?.members || []).filter((u) => u.id !== memberToRemove.id),
        }));
      } else {
        Notification.error(res?.data?.error || "Failed to remove member");
      }
    } catch (err) {
      Notification.error(err?.response?.data?.error || "Failed to remove member");
    } finally {
      setIsRemoveModalOpen(false);
      setMemberToRemove(null);
    }
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600">
            <IconComponent icon="mdi:loading" width={20} className="animate-spin" />
            <p>Loading your team…</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (!team) {
    return (
      <DefaultLayout>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-red-600">
            <IconComponent icon="mdi:alert-circle-outline" width={20} />
            <p className="text-gray-700">You don’t have a team yet.</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <IconComponent icon="mdi:account-group" width={28} className="text-indigo-600" />
            {team.name}
          </h1>
        </div>

        {/* Managers (all) */}
        <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-3">
            <IconComponent icon="mdi:account-tie" width={22} className="text-green-600" />
            Managers {team.managers?.length ? `(${team.managers.length})` : ""}
          </h2>

          {team.managers && team.managers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {team.managers.map((mgr) => (
                <span
                  key={mgr.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                  title={mgr.email}
                >
                  <IconComponent icon="mdi:account-tie" width={14} className="text-green-600" />
                  {mgr.full_name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No managers listed.</p>
          )}
        </div>

        {/* Members Grid */}
        <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-4">
            <IconComponent icon="mdi:account-multiple" width={22} className="text-blue-600" />
            Members ({members.length})
          </h2>

          {members.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold mr-3">
                      {member.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => confirmRemove(member)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-500 text-red-600 rounded-md hover:bg-red-50 transition"
                    title="Remove member"
                  >
                    <IconComponent icon="mdi:account-minus" width={16} className="text-red-600" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No members in your team.</p>
          )}
        </div>
      </div>

      {/* Remove Member Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => {
          setIsRemoveModalOpen(false);
          setMemberToRemove(null);
        }}
        title="Remove Member"
        size="sm"
      >
        <p className="text-gray-700">
          Remove <span className="font-semibold">{memberToRemove?.full_name}</span> from your team?
        </p>
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => {
              setIsRemoveModalOpen(false);
              setMemberToRemove(null);
            }}
            className="text-sm px-4 py-1.5 rounded bg-gray-300"
          >
            Cancel
          </button>
          <button onClick={handleRemove} className="text-sm px-4 py-1.5 rounded bg-red-500 text-white">
            Remove
          </button>
        </div>
      </Modal>
    </DefaultLayout>
  );
};

export default ManagerTeam;
