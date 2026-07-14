import { useAppStore } from "../../store/useAppStore";
import { EarthquakeList } from "./EarthquakeList";
import { panelStyle } from "./panelStyle";
import { MAX_RELIABLE_WINDOW_MS } from "../../utils/seismicWave";

export function EarthquakeDetail() {
  const selected = useAppStore((s) => s.selectedEarthquake);
  const selectEarthquake = useAppStore((s) => s.selectEarthquake);
  const stats = useAppStore((s) => s.stats);
  const setTimeRange = useAppStore((s) => s.setTimeRange);

  if (!selected) return null;

  // Centers the replay window on this quake at exactly MAX_RELIABLE_WINDOW_MS
  // wide — the widest window SeismicWaveLayer will still animate a P-wave
  // for. Clamped to the loaded dataset's bounds (only matters for a quake
  // within half a window of the very first/last one); clamping only narrows
  // the window, never widens it past MAX_RELIABLE_WINDOW_MS.
  const handleCenterReplayWindow = () => {
    if (!selected.occurred_at) return;
    const t = new Date(selected.occurred_at).getTime();
    const half = MAX_RELIABLE_WINDOW_MS / 2;
    let start = t - half;
    let end = t + half;
    if (stats?.earliest && stats?.latest) {
      const minMs = new Date(stats.earliest).getTime();
      const maxMs = new Date(stats.latest).getTime();
      start = Math.max(start, minMs);
      end = Math.min(end, maxMs);
    }
    setTimeRange([start, end]);
  };

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

      {selected.occurred_at && (
        <button
          onClick={handleCenterReplayWindow}
          title="Center a 30-minute replay window on this quake — press Play in Replay to watch its P-wave animation."
          style={{
            width: "100%",
            marginTop: 10,
            padding: "8px 10px",
            background: "rgba(77,184,255,0.15)",
            color: "#4db8ff",
            border: "1px solid #334",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Center 30-min Replay Window
        </button>
      )}
    </div>
  );
}
