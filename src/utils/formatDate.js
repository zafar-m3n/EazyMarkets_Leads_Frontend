// src/utils/formatDate.js
export function formatDate(dateInput) {
  if (!dateInput) return "-";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Future dates: show absolute timestamp
  if (diffMs < 0) return formatAbsolute(date);

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just Now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  // Use calendar month difference for 1–3 months
  const months = diffInCalendarMonths(date, now);
  if (months >= 1 && months <= 3) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  // Fallback: absolute date/time for > 3 months
  return formatAbsolute(date);
}

function formatAbsolute(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Returns the integer number of calendar months between `from` and `to`.
 * If the day-of-month for `to` is earlier than `from`, subtract one.
 */
function diffInCalendarMonths(from, to) {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  let months = yearDiff * 12 + monthDiff;

  // Adjust if we haven't reached the "from" day in the current month yet
  if (to.getDate() < from.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}
