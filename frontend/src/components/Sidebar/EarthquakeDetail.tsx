import { useAppStore } from "../../store/useAppStore";
import { EarthquakeList } from "./EarthquakeList";
import { panelStyle } from "./panelStyle";

export function EarthquakeDetail() {
  const selected = useAppStore((s) => s.selectedEarthquake);
  const selectEarthquake = useAppStore((s) => s.selectEarthquake);

  if (!selected) return null;

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e0f0ff" }}>Selected Earthquake</h3>
        <button
          onClick={() => selectEarthquake(null)}
          style={{
            background: "none",
            border: "1px solid #334",
            color: "#7090a0",
            borderRadius: 4,
            cursor: "pointer",
            padding: "2px 8px",
            fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>

      <EarthquakeList earthquakes={[selected]} />
    </div>
  );
}
