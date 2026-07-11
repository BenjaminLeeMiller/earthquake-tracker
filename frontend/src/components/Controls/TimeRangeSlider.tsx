import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "../Sidebar/panelStyle";

function fmt(ms: number) {
  return new Date(ms).toLocaleDateString();
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function TimeRangeSlider() {
  const stats = useAppStore((s) => s.stats);
  const timeRange = useAppStore((s) => s.timeRange);
  const setTimeRange = useAppStore((s) => s.setTimeRange);

  const bounds =
    stats?.earliest && stats?.latest
      ? ([new Date(stats.earliest).getTime(), new Date(stats.latest).getTime()] as const)
      : null;

  useEffect(() => {
    if (bounds && !timeRange) {
      // Default the starting date to 1 week ago (clamped to the available
      // data), not all the way back to the earliest quake — the slider's
      // own draggable bounds still span the full dataset.
      const defaultStart = Math.max(bounds[0], Math.min(Date.now() - ONE_WEEK_MS, bounds[1]));
      setTimeRange([defaultStart, bounds[1]]);
    }
  }, [bounds, timeRange, setTimeRange]);

  if (!bounds || !timeRange) return null;

  const [minMs, maxMs] = bounds;
  const [start, end] = timeRange;

  return (
    <div style={{ ...panelStyle, ...styles.wrapper }}>
      <span style={styles.label}>Time Range</span>
      <span style={styles.value}>
        {fmt(start)} – {fmt(end)}
      </span>

      <div style={styles.row}>
        <span style={styles.rowLabel}>From</span>
        <input
          type="range"
          min={minMs}
          max={maxMs}
          value={start}
          onChange={(e) => setTimeRange([Math.min(Number(e.target.value), end), end])}
          style={styles.range}
        />
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>To</span>
        <input
          type="range"
          min={minMs}
          max={maxMs}
          value={end}
          onChange={(e) => setTimeRange([start, Math.max(Number(e.target.value), start)])}
          style={styles.range}
        />
      </div>

      <button style={styles.resetBtn} onClick={() => setTimeRange([minMs, maxMs])}>
        Reset
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: { fontSize: 12, color: "#a0b0c0", letterSpacing: "0.05em", textTransform: "uppercase" },
  value: { fontSize: 16, fontWeight: 600, color: "#e0f0ff" },
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
