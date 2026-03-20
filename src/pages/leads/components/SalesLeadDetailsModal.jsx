import React, { useEffect, useMemo, useState } from "react";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Spinner from "@/components/ui/Spinner";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import SalesLeadsModal from "./SalesLeadsModal";

const initialsFromName = (first, last) => {
  try {
    if (!first && !last) return "U";
    if (first && last) return (first[0] + last[0]).toUpperCase();

    const name = first || last || "";
    const parts = name.split(/[\s.,]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (name.length >= 2) return name.substring(0, 2).toUpperCase();
    return name[0]?.toUpperCase() || "U";
  } catch {
    return "U";
  }
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
};

const getLatestAssignment = (lead) => {
  const assignments = Array.isArray(lead?.LeadAssignments) ? [...lead.LeadAssignments] : [];
  if (!assignments.length) return null;

  assignments.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
  return assignments[0];
};

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <Icon icon={icon} width={18} />
    </div>

    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-gray-900">{value || "N/A"}</div>
    </div>
  </div>
);

const SalesLeadDetailsModal = ({ isOpen, onClose, leadId, statuses = [], orderedLeadIds = [], onLeadUpdated }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);

  const [noteInput, setNoteInput] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const currentIndex = useMemo(() => {
    return orderedLeadIds.findIndex((id) => Number(id) === Number(leadId));
  }, [orderedLeadIds, leadId]);

  const prevLeadId = currentIndex > 0 ? orderedLeadIds[currentIndex - 1] : null;
  const nextLeadId =
    currentIndex >= 0 && currentIndex < orderedLeadIds.length - 1 ? orderedLeadIds[currentIndex + 1] : null;

  const latestAssignment = useMemo(() => getLatestAssignment(lead), [lead]);

  const fetchLead = async (targetId) => {
    if (!targetId) return;

    setLoading(true);
    try {
      const res = await API.private.getLeadById(targetId);
      if (res.data?.code === "OK") {
        setLead(res.data.data);
      } else {
        Notification.error("Failed to fetch lead details");
      }
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to fetch lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      setNoteInput("");
      fetchLead(leadId);
    } else {
      setLead(null);
      setNoteInput("");
    }
  }, [isOpen, leadId]);

  const handleAddNote = async () => {
    if (!leadId) return;

    if (!noteInput.trim()) {
      Notification.error("Note cannot be empty");
      return;
    }

    setSubmittingNote(true);
    try {
      await API.private.updateLead(leadId, { notes: noteInput.trim() });
      Notification.success("Note added successfully");
      setNoteInput("");
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusSubmit = async ({ status_id }) => {
    try {
      await API.private.updateLead(leadId, { status_id });
      Notification.success("Status updated successfully");
      setIsStatusModalOpen(false);
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleOpenPrev = async () => {
    if (!prevLeadId) return;
    await onLeadUpdated?.(prevLeadId);
  };

  const handleOpenNext = async () => {
    if (!nextLeadId) return;
    await onLeadUpdated?.(nextLeadId);
  };

  const initials = initialsFromName(lead?.first_name, lead?.last_name);
  const fullName = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ").trim() || "Lead Details";
  const assignedTo = latestAssignment?.assignee?.full_name || latestAssignment?.assignee?.email || "Unassigned";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xxl"
        centered
        closeOnOverlayClick={false}
        type="leads"
        modalClass="!max-w-6xl rounded-[28px]"
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-semibold tracking-tight text-gray-900">{fullName}</h2>

                {lead && (
                  <>
                    <Badge text={lead.LeadStatus?.label || "No Status"} color="blue" size="sm" />
                    <Badge text={lead.LeadSource?.label || "No Source"} color="purple" size="sm" />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content={prevLeadId ? "Previous lead" : "No previous lead"} placement="top" theme="light">
                <button
                  type="button"
                  onClick={handleOpenPrev}
                  disabled={!prevLeadId || loading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous lead"
                >
                  <Icon icon="mdi:chevron-left" width={22} />
                </button>
              </Tooltip>

              <Tooltip content={nextLeadId ? "Next lead" : "No next lead"} placement="top" theme="light">
                <button
                  type="button"
                  onClick={handleOpenNext}
                  disabled={!nextLeadId || loading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next lead"
                >
                  <Icon icon="mdi:chevron-right" width={22} />
                </button>
              </Tooltip>

              <div className="w-fit">
                <AccentButton text="Update Status" size="sm" onClick={() => setIsStatusModalOpen(true)} />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
                aria-label="Close"
              >
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>
          </div>

          {loading ? (
            <Spinner message="Loading lead details..." />
          ) : !lead ? (
            <div className="py-10 text-center text-gray-500">Lead details could not be loaded.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-accent/15 bg-gradient-to-b from-accent/[0.08] via-white to-white p-6 shadow-sm">
                <div className="border-b border-accent/10 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-white shadow-inner">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-2xl font-semibold text-gray-900">{fullName}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge text={lead.LeadStatus?.label || "No Status"} color="blue" size="sm" />
                        <Badge text={lead.LeadSource?.label || "No Source"} color="purple" size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-gray-100">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Lead</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">#{lead.id}</div>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-gray-100">
                  <DetailRow icon="mdi:office-building-outline" label="Company" value={lead.company} />
                  <DetailRow icon="mdi:email-outline" label="Email" value={lead.email} />
                  <DetailRow icon="mdi:phone-outline" label="Phone" value={lead.phone} />
                  <DetailRow icon="mdi:earth" label="Country" value={lead.country} />
                  <DetailRow icon="mdi:account-tie-outline" label="Assigned To" value={assignedTo} />
                  <DetailRow icon="mdi:calendar-clock" label="Created" value={formatDateTime(lead.created_at)} />
                </div>
              </div>

              <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon icon="mdi:note-text-outline" width={20} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
                </div>

                <div className="mt-5 space-y-4 max-h-[360px] overflow-y-auto pr-2 app-scrollbar">
                  {Array.isArray(lead.notes) && lead.notes.length > 0 ? (
                    lead.notes.map((note) => {
                      const authorName = note.author?.full_name || note.author?.email || "Unknown";
                      const nameParts = authorName.split(" ").filter(Boolean);
                      const authorInitials = initialsFromName(
                        nameParts[0] || authorName,
                        nameParts[nameParts.length - 1] || "",
                      );

                      return (
                        <div
                          key={note.id}
                          className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 transition hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent">
                              {authorInitials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm leading-relaxed text-gray-800">{note.body}</p>
                              <div className="mt-2 text-xs text-gray-500">
                                by {authorName} · {formatDateTime(note.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm italic text-gray-500">
                      No notes yet.
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3 border-t border-gray-200 pt-5">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    rows={4}
                    placeholder="Write a new note..."
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />

                  <div className="flex justify-end gap-2">
                    <div className="w-fit">
                      <GrayButton text="Clear" onClick={() => setNoteInput("")} disabled={submittingNote} />
                    </div>
                    <div className="w-fit">
                      <AccentButton text="Add Note" onClick={handleAddNote} loading={submittingNote} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <SalesLeadsModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusSubmit}
        editingLead={lead}
        statuses={statuses}
        loading={loading}
      />
    </>
  );
};

export default SalesLeadDetailsModal;
