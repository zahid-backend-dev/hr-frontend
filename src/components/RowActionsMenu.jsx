import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MoreVertical, Pencil, Trash2, X } from "lucide-react";

/**
 * Compact ⋮ menu for table row actions.
 * Dropdown is portaled to document.body so table overflow cannot clip it.
 * items: [{ key, label, onClick, tone?: "default"|"danger"|"success", disabled?, icon? }]
 */
export function RowActionsMenu({ items = [], align = "right", ariaLabel = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const visibleItems = (items || []).filter(Boolean);

  function updatePosition() {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 160;
    const menuHeight = menu.offsetHeight || Math.max(48, visibleItems.length * 36 + 12);
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + gap && rect.top > spaceBelow;

    let left = align === "left" ? rect.left : rect.right - menuWidth;
    left = Math.min(Math.max(8, left), window.innerWidth - menuWidth - 8);

    let top = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
    top = Math.min(Math.max(8, top), window.innerHeight - menuHeight - 8);

    setCoords({ top, left, ready: true });
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords((c) => ({ ...c, ready: false }));
      return undefined;
    }
    updatePosition();
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visibleItems.length, align]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocPointer(e) {
      const inTrigger = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReposition() {
      updatePosition();
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visibleItems.length, align]);

  if (!visibleItems.length) return <span className="cell-empty">—</span>;

  return (
    <div className={`row-actions-menu ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="row-actions-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        createPortal(
          <div
            id={menuId}
            ref={menuRef}
            className="row-actions-dropdown row-actions-dropdown--portal"
            role="menu"
            style={{
              top: coords.top,
              left: coords.left,
              visibility: coords.ready ? "visible" : "hidden",
            }}
          >
            {visibleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`row-actions-item tone-${item.tone || "default"}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon ? <span className="row-actions-item-icon">{item.icon}</span> : null}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export const leaveActionIcons = {
  approve: <Check size={14} />,
  reject: <X size={14} />,
  edit: <Pencil size={14} />,
  delete: <Trash2 size={14} />,
};
