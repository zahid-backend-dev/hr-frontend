import { PAGE_SIZE_OPTIONS } from "../hooks/usePagination";

export function TablePagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  pageSize,
  setPageSize,
}) {
  if (totalItems <= 0) return null;

  return (
    <div className="table-pagination">
      <div className="table-pagination-left">
        <p className="table-pagination-meta">
          Showing {from}–{to} of {totalItems}
        </p>
        {typeof setPageSize === "function" && (
          <label className="table-pagination-size">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="table-pagination-controls">
        <button type="button" className="table-pagination-btn" onClick={goPrev} disabled={!hasPrev}>
          Previous
        </button>
        <span className="table-pagination-page-label">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="table-pagination-btn" onClick={goNext} disabled={!hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
