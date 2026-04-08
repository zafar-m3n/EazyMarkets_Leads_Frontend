import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "@/services/index";
import Notification from "@/components/ui/Notification";
import Spinner from "@/components/ui/Spinner";
import AccentButton from "@/components/ui/AccentButton";
import GrayButton from "@/components/ui/GrayButton";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import LeadFormModal from "./LeadFormModal";
import Modal from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import TextInput from "@/components/form/TextInput";
import token from "@/lib/utilities";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const initialsFromName = (first, last) => {
  try {
    if (first && last) return (first[0] + last[0]).toUpperCase();
    const name = first || last || "";
    if (!name) return "U";
    const parts = name.split(/[ ,\.]+/).filter(Boolean);
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  } catch {
    return "U";
  }
};

const parseNoteDateTimeValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatSelectedNoteDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
};

const NoteDateTimeTrigger = React.forwardRef(({ onClick, active }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-accent"
    }`}
    aria-label="Select note date and time"
    title="Select note date and time"
  >
    <Icon icon="mdi:calendar-clock-outline" width={18} />
  </button>
));

NoteDateTimeTrigger.displayName = "NoteDateTimeTrigger";

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

const ConfirmDeleteNoteModal = ({ isOpen, note, onCancel, onConfirm }) => {
  if (!note) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Delete Note" size="sm" centered>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-700">
          Are you sure you want to delete this note?
          <br />
          <span className="mt-1 block break-words text-xs italic text-gray-500">
            “{note.body.substring(0, 120)}
            {note.body.length > 120 ? "..." : ""}”
          </span>
        </p>

        <div className="flex justify-end gap-3">
          <div className="w-fit">
            <GrayButton text="Cancel" onClick={onCancel} />
          </div>
          <div className="w-fit">
            <AccentButton text="Delete" onClick={onConfirm} customClass="!bg-red-600 hover:!bg-red-700" />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const LeadDetailsModal = ({
  isOpen,
  onClose,
  leadId,
  statuses = [],
  sources = [],
  orderedLeadIds = [],
  onLeadUpdated,
}) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [noteInput, setNoteInput] = useState("");
  const [noteDateTime, setNoteDateTime] = useState(null);
  const [submittingNote, setSubmittingNote] = useState(false);

  const [isNotePickerOpen, setIsNotePickerOpen] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [updatingNote, setUpdatingNote] = useState(false);

  const notePickerWrapRef = useRef(null);
  const notePickerRef = useRef(null);

  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);

  const me = token.getUserData();
  const role = me?.role?.value;
  const isAdminOrManager = role === "admin" || role === "manager";

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
      setNoteDateTime(null);
      setIsNotePickerOpen(false);
      setEditingNoteId(null);
      setEditingNoteBody("");
      fetchLead(leadId);
    } else {
      setLead(null);
      setNoteInput("");
      setNoteDateTime(null);
      setIsNotePickerOpen(false);
      setEditingNoteId(null);
      setEditingNoteBody("");
    }
  }, [isOpen, leadId]);

  useEffect(() => {
    if (!isNotePickerOpen) return;

    const handleOutsideClick = (e) => {
      if (notePickerWrapRef.current?.contains(e.target) || notePickerRef.current?.contains(e.target)) return;
      setIsNotePickerOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isNotePickerOpen]);

  const handleSubmit = async (data) => {
    if (!leadId) return;

    setSaving(true);
    try {
      await API.private.updateLead(leadId, data);
      Notification.success("Lead updated successfully");
      setIsEditModalOpen(false);
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!leadId) return;

    if (!noteInput.trim()) {
      Notification.error("Note cannot be empty");
      return;
    }

    setSubmittingNote(true);
    try {
      await API.private.updateLead(leadId, {
        notes: noteInput.trim(),
        note_datetime: noteDateTime ? noteDateTime.toISOString() : undefined,
      });
      Notification.success("Note added successfully");
      setNoteInput("");
      setNoteDateTime(null);
      setIsNotePickerOpen(false);
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteBody(note.body || "");
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteBody("");
  };

  const handleSaveEditNote = async (noteId) => {
    if (!leadId || !noteId) return;

    if (!editingNoteBody.trim()) {
      Notification.error("Note cannot be empty");
      return;
    }

    setUpdatingNote(true);
    try {
      await API.private.updateLeadNote(leadId, noteId, {
        body: editingNoteBody.trim(),
      });

      Notification.success("Note updated successfully");
      setEditingNoteId(null);
      setEditingNoteBody("");
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to update note");
    } finally {
      setUpdatingNote(false);
    }
  };

  const confirmDeleteNote = (note) => {
    setNoteToDelete(note);
    setIsDeleteNoteModalOpen(true);
  };

  const handleDeleteNote = async () => {
    if (!leadId || !noteToDelete) return;

    try {
      await API.private.deleteLeadNote(leadId, noteToDelete.id);
      Notification.success("Note deleted successfully");
      await fetchLead(leadId);
      await onLeadUpdated?.();
    } catch (err) {
      Notification.error(err.response?.data?.error || "Failed to delete note");
    } finally {
      setIsDeleteNoteModalOpen(false);
      setNoteToDelete(null);
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

                  <div className="mt-5">
                    <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-gray-100">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Lead</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">#{lead.id}</div>
                      </div>

                      <div className="w-fit">
                        <AccentButton text="Edit Lead" onClick={() => setIsEditModalOpen(true)} />
                      </div>
                    </div>
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
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon icon="mdi:note-text-outline" width={20} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Notes</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4 max-h-[360px] overflow-y-auto pr-2 app-scrollbar">
                  {Array.isArray(lead.notes) && lead.notes.length ? (
                    lead.notes.map((note) => {
                      const fullName = note.author?.full_name || "Unknown";
                      const parts = fullName.split(" ").filter(Boolean);
                      const authorInitials = initialsFromName(parts[0] || fullName, parts[parts.length - 1] || "");

                      return (
                        <div
                          key={note.id}
                          className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 transition hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent">
                                {authorInitials}
                              </div>

                              <div className="min-w-0 flex-1">
                                {editingNoteId === note.id ? (
                                  <div className="space-y-2">
                                    <TextInput
                                      value={editingNoteBody}
                                      onChange={(e) => setEditingNoteBody(e.target.value)}
                                      placeholder="Edit note..."
                                      className="rounded-xl"
                                    />

                                    <div className="mt-2 text-xs text-gray-500">
                                      by {fullName} · {formatDateTime(note.created_at)}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="break-words text-sm leading-relaxed text-gray-800">{note.body}</p>
                                    <div className="mt-2 text-xs text-gray-500">
                                      by {fullName} · {formatDateTime(note.created_at)}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-shrink-0 items-center gap-2">
                              {editingNoteId === note.id ? (
                                <>
                                  <Tooltip content="Save note" placement="top" theme="light">
                                    <button
                                      onClick={() => handleSaveEditNote(note.id)}
                                      disabled={updatingNote}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      aria-label="Save note"
                                    >
                                      <Icon icon="mdi:check" width={18} />
                                    </button>
                                  </Tooltip>

                                  <Tooltip content="Cancel edit" placement="top" theme="light">
                                    <button
                                      onClick={handleCancelEditNote}
                                      disabled={updatingNote}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      aria-label="Cancel edit"
                                    >
                                      <Icon icon="mdi:close" width={18} />
                                    </button>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip content="Edit note" placement="top" theme="light">
                                    <button
                                      onClick={() => handleStartEditNote(note)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-accent/10 hover:text-accent"
                                      aria-label="Edit note"
                                    >
                                      <Icon icon="mdi:pencil-outline" width={18} />
                                    </button>
                                  </Tooltip>

                                  {isAdminOrManager && (
                                    <Tooltip content="Delete note" placement="top" theme="light">
                                      <button
                                        onClick={() => confirmDeleteNote(note)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                        aria-label="Delete note"
                                      >
                                        <Icon icon="mdi:delete-outline" width={18} />
                                      </button>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm italic text-gray-500">
                      No notes added yet.
                    </div>
                  )}
                </div>

                <div className="relative mt-6 space-y-3 border-t border-gray-200 pt-5">
                  <div className="relative" ref={notePickerWrapRef}>
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      rows={4}
                      placeholder="Write a new note..."
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 pr-14 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />

                    <div className="absolute right-3 top-3">
                      <DatePicker
                        ref={notePickerRef}
                        selected={noteDateTime}
                        onChange={(date) => {
                          setNoteDateTime(parseNoteDateTimeValue(date));
                          setIsNotePickerOpen(false);
                        }}
                        onClickOutside={() => setIsNotePickerOpen(false)}
                        onCalendarOpen={() => setIsNotePickerOpen(true)}
                        onCalendarClose={() => setIsNotePickerOpen(false)}
                        open={isNotePickerOpen}
                        onInputClick={() => setIsNotePickerOpen(true)}
                        showTimeSelect
                        timeIntervals={5}
                        dateFormat="yyyy-MM-dd h:mm aa"
                        maxDate={new Date()}
                        customInput={<NoteDateTimeTrigger active={!!noteDateTime || isNotePickerOpen} />}
                        popperPlacement="top-end"
                        popperClassName="note-datetime-popper"
                      />
                    </div>

                    {isNotePickerOpen && (
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/20" />
                    )}
                  </div>

                  {noteDateTime && (
                    <div className="flex items-center gap-2 rounded-xl border border-accent/15 bg-accent/5 px-3 py-2 text-xs text-gray-700">
                      <Icon icon="mdi:calendar-clock-outline" width={16} className="text-accent" />
                      <span>Selected note date & time: {formatSelectedNoteDateTime(noteDateTime)}</span>

                      <button
                        type="button"
                        onClick={() => setNoteDateTime(null)}
                        className="ml-auto inline-flex items-center rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-black/5 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <div className="w-fit">
                      <GrayButton
                        text="Clear"
                        onClick={() => {
                          setNoteInput("");
                          setNoteDateTime(null);
                          setIsNotePickerOpen(false);
                        }}
                        disabled={submittingNote}
                      />
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

      <LeadFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSubmit}
        editingLead={lead}
        statuses={statuses}
        sources={sources}
        loading={saving}
      />

      <ConfirmDeleteNoteModal
        isOpen={isDeleteNoteModalOpen}
        note={noteToDelete}
        onCancel={() => setIsDeleteNoteModalOpen(false)}
        onConfirm={handleDeleteNote}
      />
    </>
  );
};

export default LeadDetailsModal;
