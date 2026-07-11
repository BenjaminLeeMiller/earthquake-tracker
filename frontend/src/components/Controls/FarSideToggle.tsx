import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "../Sidebar/panelStyle";

export function FarSideToggle() {
  const hideFarSide = useAppStore((s) => s.hideFarSide);
  const setHideFarSide = useAppStore((s) => s.setHideFarSide);

  return (
    <div style={panelStyle}>
      <label style={styles.row}>
        <input
          type="checkbox"
          checked={hideFarSide}
          onChange={(e) => setHideFarSide(e.target.checked)}
          style={styles.checkbox}
        />
        <span style={styles.label}>Hide Far-Side Quakes</span>
      </label>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  checkbox: { accentColor: "#4db8ff", cursor: "pointer", width: 14, height: 14 },
  label: { fontSize: 12, color: "#c0d8e8", fontWeight: 500 },
};
