import { useAppStore } from "../../store/useAppStore";
import { MAX_DEPTH_LAYERS, CELL_SIZE_KM } from "../../utils/grid";

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 16px",
    background: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    backdropFilter: "blur(6px)",
    minWidth: 220,
  },
  label: { fontSize: 12, color: "#a0b0c0", letterSpacing: "0.05em", textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: 600, color: "#e0f0ff" },
  range: { width: "100%", accentColor: "#4db8ff", cursor: "pointer" },
};

export function DepthSlider() {
  const depthLayer = useAppStore((s) => s.depthLayer);
  const setDepthLayer = useAppStore((s) => s.setDepthLayer);

  const depthMinKm = depthLayer * CELL_SIZE_KM;
  const depthMaxKm = (depthLayer + 1) * CELL_SIZE_KM;

  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>Depth Layer</span>
      <span style={styles.value}>
        {depthMinKm.toFixed(0)}–{depthMaxKm.toFixed(0)} km
        <span style={{ fontSize: 11, color: "#7090a0", marginLeft: 6 }}>
          ({(depthMinKm / 1.609).toFixed(0)}–{(depthMaxKm / 1.609).toFixed(0)} mi)
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={MAX_DEPTH_LAYERS - 1}
        value={depthLayer}
        onChange={(e) => setDepthLayer(Number(e.target.value))}
        style={styles.range}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#506070" }}>
        <span>Surface</span>
        <span>Layer {depthLayer} / {MAX_DEPTH_LAYERS - 1}</span>
        <span>~450 mi deep</span>
      </div>
    </div>
  );
}
