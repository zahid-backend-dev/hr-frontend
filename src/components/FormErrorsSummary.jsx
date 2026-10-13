export function FormErrorsSummary({ errors }) {
  const messages = Object.values(errors || {}).filter(Boolean);
  if (!messages.length) return null;
  return (
    <div className="form-errors-summary" role="alert">
      <strong>
        Please fix {messages.length} error{messages.length > 1 ? "s" : ""}:
      </strong>
      <ul>
        {messages.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
