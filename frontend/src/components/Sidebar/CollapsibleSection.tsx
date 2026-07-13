import type { ReactNode } from "react";
import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "./panelStyle";

interface CollapsibleSectionProps {
  // Unique key coordinating the sidebar's accordion behavior — expanding
  // this section collapses whichever other <CollapsibleSection> was open
  // (see expandedSection in useAppStore.ts).
  id: string;
  label: string;
  summary: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({ id, label, summary, children }: CollapsibleSectionProps) {
  const expanded = useAppStore((s) => s.expandedSection === id);
  const setExpandedSection = useAppStore((s) => s.setExpandedSection);

  return (
    <div style={{ ...panelStyle, ...styles.wrapper }}>
      <button
        type="button"
        style={styles.header}
        onClick={() => setExpandedSection(expanded ? null : id)}
        aria-expanded={expanded}
      >
        <div style={styles.headerText}>
          <span style={styles.label}>{label}</span>
          <span style={styles.value}>{summary}</span>
        </div>
        <span style={styles.chevron}>{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && <div style={styles.content}>{children}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 6 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    color: "inherit",
  },
  headerText: { display: "flex", flexDirection: "column", gap: 2 },
  label: { fontSize: 12, color: "#a0b0c0", letterSpacing: "0.05em", textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: 600, color: "#e0f0ff" },
  chevron: { fontSize: 12, color: "#7090a0", width: 14, textAlign: "center", flexShrink: 0 },
  content: { display: "flex", flexDirection: "column", gap: 6 },
};
