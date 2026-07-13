import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "../Sidebar/panelStyle";

export function VolcanoLayerToggle() {
  const volcanoesVisible = useAppStore((s) => s.volcanoesVisible);
  const setVolcanoesVisible = useAppStore((s) => s.setVolcanoesVisible);

  return (
    <div style={panelStyle}>
      <label style={styles.row}>
        <input
          type="checkbox"
          checked={volcanoesVisible}
          onChange={(e) => setVolcanoesVisible(e.target.checked)}
          style={styles.checkbox}
        />
        <span style={styles.label}>Volcanoes</span>
      </label>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  checkbox: { accentColor: "#4db8ff", cursor: "pointer", width: 14, height: 14 },
  label: { fontSize: 12, color: "#c0d8e8", fontWeight: 500 },
};
