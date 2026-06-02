export default function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "passed" || s === "ok" || s === "success"
      ? "badge good"
      : s === "failed" || s.includes("error")
        ? "badge bad"
        : s === "running" || s === "queued" || s.includes("warning")
          ? "badge warn"
          : s === "blocked"
            ? "badge bad"
            : s === "dry-run" || s === "not_posted"
              ? "badge info"
              : "badge";

  return <span className={cls}>{status}</span>;
}
