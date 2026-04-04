import type { ReactNode } from "react";

export default function SectionIntro({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
