import React, { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/DefaultLayout";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Pagination from "@/components/ui/Pagination";
import Table from "@/components/ui/Table";
import IconComponent from "@/components/ui/Icon";
import Heading from "@/components/ui/Heading";
import AccentButton from "@/components/ui/AccentButton";
import UserFormModal from "./components/UserFormModal";
import Modal from "@/components/ui/Modal";
import Select from "@/components/form/Select";
import Spinner from "@/components/ui/Spinner";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false); // modal submit state

  // Fetching state for list (table)
  const [isFetching, setIsFetching] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // User Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async (currentPage = page, currentLimit = limit) => {
    setIsFetching(true);
    try {
      const res = await API.private.getUsers({ page: currentPage, limit: currentLimit });
      if (res.data.code === "OK") {
        setUsers(res.data.data.users || []);
        setTotalPages(res.data.data.pagination.totalPages);
      } else {
        Notification.error(res.data.error || "Failed to fetch users");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch users");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await API.private.getRoles();
      if (res.data.code === "OK") {
        setRoles(res.data.data.map((role) => ({ value: role.id, label: role.label })));
      } else {
        Notification.error(res.data.error || "Failed to fetch roles");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch roles");
    }
  };

  useEffect(() => {
    fetchUsers(page, limit);
  }, [page, limit]);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Add/Edit submit
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (editingUser) {
        const res = await API.private.updateUser(editingUser.id, data);
        if (res.data.code === "OK") {
          Notification.success("User updated successfully");
        } else {
          Notification.error(res.data.error || "Failed to update user");
          return;
        }
      } else {
        const res = await API.private.createUser(data);
        if (res.data.code === "OK") {
          Notification.success("User created successfully");
        } else {
          Notification.error(res.data.error || "Failed to create user");
          return;
        }
      }
      await fetchUsers(page, limit);
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await API.private.deleteUser(userToDelete.id);
      if (res.data.code === "OK") {
        Notification.success("User deleted successfully");
        await fetchUsers(page, limit);
      } else {
        Notification.error(res.data.error || "Failed to delete user");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to delete user");
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const columns = [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "phone", label: "Phone" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <DefaultLayout>
      <div className="space-y-6">
        {/* Heading + Actions (Rows-per-page + Add) */}
        <div className="flex justify-between items-center">
          <Heading>Manage Users</Heading>
          <div className="flex items-end gap-4">
            {/* Rows per page - moved to header on the right */}
            <div className="w-40">
              <Select
                label="Rows per page"
                value={limit}
                onChange={(val) => {
                  setPage(1);
                  setLimit(Number(val));
                }}
                options={[
                  { value: 10, label: "10" },
                  { value: 25, label: "25" },
                  { value: 50, label: "50" },
                  { value: 100, label: "100" },
                ]}
                placeholder="Rows"
              />
            </div>

            {/* Add user button */}
            <div className="w-fit">
              <AccentButton
                text="Add User"
                onClick={() => {
                  setEditingUser(null);
                  setIsModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        {/* Users Table or Spinner */}
        <div className="min-h-[240px] flex items-center justify-center">
          {isFetching ? (
            <Spinner message="Loading users..." />
          ) : (
            <Table
              columns={columns}
              data={users}
              emptyMessage="No users found."
              renderCell={(row, col) => {
                switch (col.key) {
                  case "role":
                    return row.Role?.label || "-";
                  case "phone":
                    return row.phone && row.phone.length > 4 ? row.phone : "N/A";
                  case "actions":
                    return (
                      <div className="flex space-x-2">
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
          )}
        </div>

        {/* Pagination (alone below table for cleaner look) */}
        {!isFetching && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} className="mt-2" />
        )}

        {/* Create/Edit Modal */}
        <UserFormModal
          key={editingUser?.id ?? "new"} // force remount to avoid stale form state
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleSubmit}
          editingUser={editingUser}
          roles={roles}
          loading={loading}
        />

        {/* Delete confirmation */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          size="sm"
        >
          <p>
            Are you sure you want to delete <span className="font-semibold">{userToDelete?.full_name}</span>?
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

export default ManageUsers;
