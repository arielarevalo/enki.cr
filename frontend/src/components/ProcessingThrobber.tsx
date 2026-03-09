export function ProcessingThrobber() {
  return (
    <div className="processing">
      <div className="processing__spinner" />
      <div className="processing__text processing__pulse">Processing…</div>
    </div>
  );
}
