export default function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "passed" || s === "ok"
      ? "badge good"
      : s === "failed" || s === "error"
        ? "badge bad"
        : s === "running" || s === "queued"
          ? "badge warn"
          : "badge";

  return <span className={cls}>{status}</span>;
}
