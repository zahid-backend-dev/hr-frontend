import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Settings, TrendingUp } from "lucide-react";
import { NavLink } from "react-router-dom";

function notificationsStorageKey(userId) {
  return `basirah:notifications-seen:${userId || "anon"}`;
}

export function AppTopBar({
  user,
  logout,
  salaryRevisionNotice,
  dismissSalaryRevisionNotice,
  mySalaryRevisions = [],
  pendingLeavesCount = 0,
  canManageLeaves = false,
  compact = false,
}) {
  const [openMenu, setOpenMenu] = useState(null); // "notifications" | "profile" | null
  const [seenSignature, setSeenSignature] = useState("");
  const rootRef = useRef(null);

  const notifications = useMemo(() => {
    const items = [];
    const salaryItems = Array.isArray(mySalaryRevisions) ? mySalaryRevisions.slice(0, 3) : [];
    for (const revision of salaryItems) {
      const prev = Number(revision.previousSalary);
      const next = Number(revision.newSalary);
      const money = (value) =>
        Number.isFinite(value)
          ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          : null;
      const type = String(revision.changeType || "");
      let text = salaryRevisionNotice?.id === revision.id ? salaryRevisionNotice.text : null;
      if (!text) {
        const parts = [];
        if (type === "promotion" || type === "both") {
          parts.push(`promoted to ${revision.newDesignation || "a new role"}`);
        }
        if (type === "salary_increase" || type === "both" || type === "adjustment") {
          const from = money(prev);
          const to = money(next);
          if (from != null && to != null) parts.push(`salary updated from ${from} to ${to}`);
          else parts.push("salary updated");
        }
        text = `You have been ${parts.join(" and ") || "updated"}${
          revision.effectiveDate ? ` (effective ${String(revision.effectiveDate).slice(0, 10)})` : ""
        }.`;
      }
      items.push({
        id: `salary-${revision.id}`,
        icon: TrendingUp,
        title:
          type === "promotion"
            ? "Promotion"
            : type === "both"
              ? "Promotion + salary"
              : type === "adjustment"
                ? "Salary adjustment"
                : "Salary increase",
        text,
        to: "/salary-slips/revisions",
        onClick: salaryRevisionNotice?.id === revision.id ? dismissSalaryRevisionNotice : undefined,
      });
    }
    if (canManageLeaves && pendingLeavesCount > 0) {
      items.push({
        id: `pending-leaves-${pendingLeavesCount}`,
        icon: Bell,
        title: "Pending leave requests",
        text: `${pendingLeavesCount} leave request${pendingLeavesCount === 1 ? "" : "s"} waiting for review.`,
        to: "/leaves/all",
      });
    }
    return items;
  }, [mySalaryRevisions, salaryRevisionNotice, dismissSalaryRevisionNotice, canManageLeaves, pendingLeavesCount]);

  const currentSignature = notifications.map((item) => item.id).join("|");
  const unreadCount = currentSignature && currentSignature !== seenSignature ? notifications.length : 0;

  useEffect(() => {
    function syncSeen() {
      if (!user?.id) {
        setSeenSignature("");
        return;
      }
      setSeenSignature(localStorage.getItem(notificationsStorageKey(user.id)) || "");
    }
    syncSeen();
    window.addEventListener("storage", syncSeen);
    window.addEventListener("basirah-notifications-seen", syncSeen);
    return () => {
      window.removeEventListener("storage", syncSeen);
      window.removeEventListener("basirah-notifications-seen", syncSeen);
    };
  }, [user?.id]);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpenMenu(null);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function markNotificationsSeen() {
    const signature = currentSignature || "";
    setSeenSignature(signature);
    if (user?.id) {
      localStorage.setItem(notificationsStorageKey(user.id), signature);
    }
    window.dispatchEvent(new Event("basirah-notifications-seen"));
  }

  function toggle(menu) {
    setOpenMenu((prev) => {
      const next = prev === menu ? null : menu;
      if (next === "notifications") markNotificationsSeen();
      return next;
    });
  }

  const roleLabel = (user?.designation || user?.role || "user").toString();
  const displayName = user?.fullName || "User";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  return (
    <header className={`app-topbar ${compact ? "app-topbar--compact" : ""} ${openMenu ? "app-topbar--menu-open" : ""}`} ref={rootRef}>
      {!compact && (
        <div className="app-topbar__greeting">
          <p className="app-topbar__eyebrow">Basirah HR</p>
          <strong className="app-topbar__name">{displayName}</strong>
        </div>
      )}

      <div className="app-topbar__actions">
        <div className="app-topbar__menu">
          <button
            type="button"
            className={`app-topbar__icon-btn ${openMenu === "notifications" ? "is-open" : ""}`}
            aria-label="Notifications"
            aria-expanded={openMenu === "notifications"}
            onClick={() => toggle("notifications")}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="app-topbar__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {openMenu === "notifications" && (
            <div className="app-topbar__dropdown app-topbar__dropdown--notifications" role="menu">
              <div className="app-topbar__dropdown-head">Notifications</div>
              {notifications.length === 0 ? (
                <p className="app-topbar__empty">No new notifications</p>
              ) : (
                notifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      className="app-topbar__notif"
                      role="menuitem"
                      onClick={() => {
                        item.onClick?.();
                        setOpenMenu(null);
                      }}
                    >
                      <span className="app-topbar__notif-icon">
                        <Icon size={16} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>
                    </NavLink>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="app-topbar__menu">
          <button
            type="button"
            className={`app-topbar__profile-btn ${openMenu === "profile" ? "is-open" : ""}`}
            aria-label="Profile menu"
            aria-expanded={openMenu === "profile"}
            onClick={() => toggle("profile")}
          >
            <span className="app-topbar__avatar" aria-hidden="true">
              {initials}
            </span>
            {!compact && (
              <span className="app-topbar__profile-meta">
                <strong>{displayName}</strong>
                <small>{roleLabel}</small>
              </span>
            )}
            <ChevronDown size={16} className="app-topbar__chevron" />
          </button>
          {openMenu === "profile" && (
            <div className="app-topbar__dropdown app-topbar__dropdown--profile" role="menu">
              <div className="app-topbar__profile-card">
                <span className="app-topbar__avatar app-topbar__avatar--lg" aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <strong>{displayName}</strong>
                  <small>{user?.email || roleLabel}</small>
                </div>
              </div>
              <NavLink to="/account" className="app-topbar__menu-item" role="menuitem" onClick={() => setOpenMenu(null)}>
                <Settings size={16} />
                <span>Account</span>
              </NavLink>
              <button
                type="button"
                className="app-topbar__menu-item app-topbar__menu-item--danger"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(null);
                  logout?.();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
