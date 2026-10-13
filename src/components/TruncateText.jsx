import { truncateText } from "../utils/truncateText";

/**
 * Show truncated text with full value on hover (title).
 */
export function TruncateText({ value, max = 40, empty = "—", className = "", as: Tag = "span" }) {
  const raw = value == null ? "" : String(value);
  if (!raw.trim()) {
    return <Tag className={className || undefined}>{empty}</Tag>;
  }
  const display = truncateText(raw, max);
  const truncated = display !== raw;
  return (
    <Tag className={`truncate-text ${className}`.trim()} title={truncated ? raw : undefined}>
      {display}
    </Tag>
  );
}

export { truncateText };
