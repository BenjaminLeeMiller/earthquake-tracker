import { useAppStore } from "../../store/useAppStore";
import { magColor, MAX_MAG } from "../../utils/magnitude";
import { computeHistogramBuckets } from "../../utils/replayHistogram";

// Fixed bucket count rather than one measured from the container at
// runtime: the sidebar is a hardcoded fixed width in this app (no
// responsive resizing), so a static count tuned to look right at that
// width is equivalent to measuring it, without needing a ResizeObserver.
const BAR_COUNT = 60;
const CHART_HEIGHT = 32;

export function ReplayHistograms() {
  const timeRange = useAppStore((s) => s.timeRange);
  const magRange = useAppStore((s) => s.magRange);
  const playbackTime = useAppStore((s) => s.playbackTime);
  const isPlaying = useAppStore((s) => s.isPlaying);
  // The shared dataset — fetched once by EarthquakeDataLoader, not per-component.
  const quakes = useAppStore((s) => s.earthquakes);

  if (!timeRange) return null;
  const [start, end] = timeRange;

  const buckets = computeHistogramBuckets(quakes, timeRange, magRange, BAR_COUNT);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  // Matches EarthquakeLayer.tsx's BucketMesh: paused (isPlaying false but
  // playbackTime set) still counts as an active session, only Reset
  // (playbackTime -> null) clears it.
  const playbackActive = isPlaying || playbackTime !== null;
  const progressPct = playbackActive
    ? Math.min(100, Math.max(0, (((playbackTime ?? start) - start) / (end - start)) * 100))
    : null;

  return (
    <div style={styles.wrapper}>
      <Histogram label="Quakes / slice" progressPct={progressPct}>
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{
              ...styles.bar,
              height: `${(b.count / maxCount) * 100}%`,
              background: "#4db8ff",
            }}
          />
        ))}
      </Histogram>
      <Histogram label="Max magnitude / slice" progressPct={progressPct}>
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{
              ...styles.bar,
              height:
                b.maxMagnitude === null
                  ? "3%"
                  : `${Math.max(4, (b.maxMagnitude / MAX_MAG) * 100)}%`,
              background: b.maxMagnitude === null ? "#223244" : magColor(b.maxMagnitude),
            }}
          />
        ))}
      </Histogram>
    </div>
  );
}

interface HistogramProps {
  label: string;
  progressPct: number | null;
  children: React.ReactNode;
}

function Histogram({ label, progressPct, children }: HistogramProps) {
  return (
    <div style={styles.histogram}>
      <span style={styles.histLabel}>{label}</span>
      <div style={styles.chart}>
        <div style={styles.bars}>{children}</div>
        {progressPct !== null && (
          <div
            data-testid="replay-progress-line"
            style={{ ...styles.progressLine, left: `${progressPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", marginTop: 4 },
  histogram: { marginTop: 8 },
  histLabel: {
    fontSize: 10,
    color: "#7090a0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  chart: { position: "relative", height: CHART_HEIGHT, marginTop: 3 },
  bars: { display: "flex", alignItems: "flex-end", gap: 1, height: "100%", width: "100%" },
  bar: { flex: 1, minWidth: 1, borderRadius: 1 },
  progressLine: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 2,
    marginLeft: -1,
    background: "#ff3b3b",
    boxShadow: "0 0 4px rgba(255,59,59,0.8)",
    pointerEvents: "none",
  },
};
