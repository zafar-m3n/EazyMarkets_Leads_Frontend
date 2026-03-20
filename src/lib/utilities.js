import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "leadhive.token";
const USER_KEY = "leadhive.user";
const LOGOUT_BCAST_KEY = "leadhive.logout_at"; // storage event key for cross-tab sync
const LEADS_FILTERS_KEY = "leadhive.filters.leadsList";
const SKEW_MS = 2000; // fire slightly early to avoid edge races

let logoutTimerId = null;
let onExpireCallback = null;

/* ---------------------------
 * Basic storage helpers
 * --------------------------*/
const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

const setAuthToken = (authToken) => {
  localStorage.setItem(TOKEN_KEY, authToken);
};

const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const getUserData = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

const setUserData = (userData) => {
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

const removeUserData = () => {
  localStorage.removeItem(USER_KEY);
};

/* ---------------------------
 * JWT exp helpers
 * --------------------------*/
const decodeExpMs = () => {
  const t = getAuthToken();
  if (!t) return null;
  try {
    const { exp } = jwtDecode(t); // exp is in SECONDS
    if (!exp) return null;
    return exp * 1000; // convert to ms
  } catch {
    return null;
  }
};

const isAuthenticated = () => !!getAuthToken();

const isExpired = () => {
  const expMs = decodeExpMs();
  if (!expMs) {
    // If no exp or bad token: consider it invalid/expired when a token exists
    return isAuthenticated() ? true : false;
  }
  return Date.now() >= expMs - SKEW_MS;
};

/* ---------------------------
 * Filters persistence: Leads List only
 * --------------------------*/
const safeParse = (raw, fallback = null) => {
  try {
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// Read filters; returns an object (never null)
const getPersistedLeadsFilters = (fallback = {}) => {
  const obj = safeParse(localStorage.getItem(LEADS_FILTERS_KEY), null);
  return obj && typeof obj === "object" ? obj : { ...fallback };
};

// Replace filters with a full object
const setPersistedLeadsFilters = (filtersObj) => {
  localStorage.setItem(LEADS_FILTERS_KEY, JSON.stringify(filtersObj ?? {}));
};

// Shallow-merge patch into existing filters
const updatePersistedLeadsFilters = (patchObj) => {
  const current = getPersistedLeadsFilters({});
  const next = { ...current, ...(patchObj ?? {}) };
  setPersistedLeadsFilters(next);
};

// Remove filters
const clearPersistedLeadsFilters = () => {
  localStorage.removeItem(LEADS_FILTERS_KEY);
};

/* ---------------------------
 * Logout + scheduling
 * --------------------------*/
const clearLogoutTimer = () => {
  if (logoutTimerId) {
    clearTimeout(logoutTimerId);
    logoutTimerId = null;
  }
};

const broadcastLogout = () => {
  // Triggers the 'storage' event in other tabs to perform the same action
  localStorage.setItem(LOGOUT_BCAST_KEY, String(Date.now()));
};

const logout = () => {
  clearLogoutTimer();
  clearPersistedLeadsFilters();
  removeAuthToken();
  removeUserData();
  broadcastLogout();
  if (typeof onExpireCallback === "function") onExpireCallback();
};

const scheduleAutoLogout = () => {
  clearLogoutTimer();
  if (!isAuthenticated()) return;

  const expMs = decodeExpMs();
  if (!expMs) {
    // Invalid token; fail closed
    logout();
    return;
  }

  const remaining = expMs - Date.now() - SKEW_MS;
  if (remaining <= 0) {
    logout();
    return;
  }

  logoutTimerId = setTimeout(() => {
    logout();
  }, remaining);
};

/* ---------------------------
 * Session initializer
 * Call once in App (e.g. inside a useEffect)
 * --------------------------*/
const initAuthSession = (handleExpire) => {
  onExpireCallback = handleExpire;

  if (isExpired()) {
    logout();
  } else {
    scheduleAutoLogout();
  }

  // Cross-tab sync: if any tab writes LOGOUT_BCAST_KEY, logout here too
  window.addEventListener("storage", (e) => {
    if (e.key === LOGOUT_BCAST_KEY) {
      clearPersistedLeadsFilters();
      clearLogoutTimer();
      removeAuthToken();
      removeUserData();
      if (typeof onExpireCallback === "function") onExpireCallback();
    }
  });
};

/* ---------------------------
 * Public API
 * --------------------------*/
const token = {
  // storage
  getAuthToken,
  setAuthToken,
  removeAuthToken,

  getUserData,
  setUserData,
  removeUserData,

  // checks
  isAuthenticated,
  isExpired,

  // lifecycle
  initAuthSession,
  scheduleAutoLogout,
  logout,

  // leads filters (single-scope)
  getPersistedLeadsFilters,
  setPersistedLeadsFilters,
  updatePersistedLeadsFilters,
  clearPersistedLeadsFilters,
};

export default token;
