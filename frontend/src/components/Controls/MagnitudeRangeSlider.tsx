import { useAppStore } from "../../store/useAppStore";
import { CollapsibleSection } from "../Sidebar/CollapsibleSection";
import { MIN_MAG, MAX_MAG } from "../../utils/magnitude";

function fmt(mag: number) {
  return mag.toFixed(1);
}

export function MagnitudeRangeSlider() {
  const magRange = useAppStore((s) => s.magRange);
  const setMagRange = useAppStore((s) => s.setMagRange);

  const [min, max] = magRange;

  return (
    <CollapsibleSection
      id="magnitudeRange"
      label="Magnitude Range"
      summary={`${fmt(min)} – ${fmt(max)}`}
    >
      <div style={styles.row}>
        <span style={styles.rowLabel}>Min</span>
        <input
          type="range"
          min={MIN_MAG}
          max={MAX_MAG}
          step={0.1}
          value={min}
          onChange={(e) => setMagRange([Math.min(Number(e.target.value), max), max])}
          style={styles.range}
        />
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>Max</span>
        <input
          type="range"
          min={MIN_MAG}
          max={MAX_MAG}
          step={0.1}
          value={max}
          onChange={(e) => setMagRange([min, Math.max(Number(e.target.value), min)])}
          style={styles.range}
        />
      </div>

      <button style={styles.resetBtn} onClick={() => setMagRange([MIN_MAG, MAX_MAG])}>
        Reset
      </button>
    </CollapsibleSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 11, color: "#7090a0", width: 32 },
  range: { flex: 1, accentColor: "#4db8ff", cursor: "pointer" },
  resetBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    fontSize: 11,
    color: "#7090a0",
    background: "transparent",
    border: "1px solid #334",
    borderRadius: 4,
    padding: "3px 8px",
    cursor: "pointer",
  },
};
