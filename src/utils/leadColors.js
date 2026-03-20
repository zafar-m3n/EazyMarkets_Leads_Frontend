export const getStatusColor = (statusValue = "") => {
  const v = String(statusValue).toLowerCase();
  const map = {
    new: "blue",
    call_back: "yellow",
    follow_up: "indigo",
    language_barrier: "purple",
    no_answer: "orange",
    not_interested: "red",
    wrong_number: "pink",
    user_busy: "teal",
    not_reachable: "gray",
  };
  return map[v] || "gray";
};

export const getSourceColor = (sourceValue = "") => {
  const v = String(sourceValue).toLowerCase();
  const map = {
    facebook: "blue",
    google: "red",
    outsource: "green",
  };
  return map[v] || "gray";
};
