import { useEffect, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CollapsibleSection } from "../Sidebar/CollapsibleSection";
import { datetimeLocalValueToMs, msToDatetimeLocalValue } from "../../utils/datetimeLocal";

function fmt(ms: number) {
  return new Date(ms).toLocaleDateString();
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function TimeRangeSlider() {
  const stats = useAppStore((s) => s.stats);
  const timeRange = useAppStore((s) => s.timeRange);
  const setTimeRange = useAppStore((s) => s.setTimeRange);

  const earliest = stats?.earliest;
  const latest = stats?.latest;
  const bounds = useMemo(
    () =>
      earliest && latest
        ? ([new Date(earliest).getTime(), new Date(latest).getTime()] as const)
        : null,
    [earliest, latest]
  );

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

  // Typed dates get the same clamping the sliders' own onChange applies
  // (stay within bounds, never cross the other handle) — the slider and the
  // datetime input are just two views onto the same [start, end] state.
  const handleFromInput = (value: string) => {
    const ms = datetimeLocalValueToMs(value);
    if (ms === null) return;
    const clamped = Math.min(Math.max(ms, minMs), maxMs);
    setTimeRange([Math.min(clamped, end), end]);
  };
  const handleToInput = (value: string) => {
    const ms = datetimeLocalValueToMs(value);
    if (ms === null) return;
    const clamped = Math.min(Math.max(ms, minMs), maxMs);
    setTimeRange([start, Math.max(clamped, start)]);
  };

  return (
    <CollapsibleSection id="timeRange" label="Time Range" summary={`${fmt(start)} – ${fmt(end)}`}>
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
        <span style={styles.rowLabel} />
        <input
          type="datetime-local"
          min={msToDatetimeLocalValue(minMs)}
          max={msToDatetimeLocalValue(maxMs)}
          value={msToDatetimeLocalValue(start)}
          onChange={(e) => handleFromInput(e.target.value)}
          style={styles.datetime}
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
      <div style={styles.row}>
        <span style={styles.rowLabel} />
        <input
          type="datetime-local"
          min={msToDatetimeLocalValue(minMs)}
          max={msToDatetimeLocalValue(maxMs)}
          value={msToDatetimeLocalValue(end)}
          onChange={(e) => handleToInput(e.target.value)}
          style={styles.datetime}
        />
      </div>

      <button style={styles.resetBtn} onClick={() => setTimeRange([minMs, maxMs])}>
        Reset
      </button>
    </CollapsibleSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 11, color: "#7090a0", width: 32 },
  range: { flex: 1, accentColor: "#4db8ff", cursor: "pointer" },
  datetime: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: "#e0f0ff",
    background: "#0d1620",
    border: "1px solid #334",
    borderRadius: 4,
    padding: "2px 4px",
    colorScheme: "dark",
  },
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
