import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "../Sidebar/panelStyle";

function fmt(ms: number) {
  return new Date(ms).toLocaleString();
}

export function PlaybackControls() {
  const timeRange = useAppStore((s) => s.timeRange);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playbackTime = useAppStore((s) => s.playbackTime);
  const playbackSpeedDaysPerSec = useAppStore((s) => s.playbackSpeedDaysPerSec);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const setPlaybackTime = useAppStore((s) => s.setPlaybackTime);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);

  if (!timeRange) return null;

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (playbackTime === null || playbackTime >= timeRange[1]) {
      setPlaybackTime(timeRange[0]);
    }
    setIsPlaying(true);
  };

  const handleReset = () => {
    // null (not timeRange[0]) clears the playback session entirely, so
    // every quake in the current filter set goes back to fully visible —
    // timeRange[0] would still count as an "active" session and leave
    // everything hidden (nothing has occurred yet relative to the clock).
    setIsPlaying(false);
    setPlaybackTime(null);
  };

  return (
    <div style={{ ...panelStyle, ...styles.wrapper }}>
      <span style={styles.label}>Replay</span>
      <div style={styles.row}>
        <button style={styles.playButton} onClick={handlePlayPause}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button style={styles.resetButton} onClick={handleReset} title="Reset to start">
          ⟲
        </button>
        <span style={styles.value}>{playbackTime !== null ? fmt(playbackTime) : "Not started"}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>Speed</span>
        <input
          type="range"
          min={0.25}
          max={14}
          step={0.25}
          value={playbackSpeedDaysPerSec}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          style={styles.range}
        />
      </div>
      <span style={styles.speedLabel}>{playbackSpeedDaysPerSec.toFixed(2)} days/sec</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#a0b0c0", letterSpacing: "0.05em", textTransform: "uppercase" },
  value: { fontSize: 13, color: "#c0d8e8", fontWeight: 500 },
  row: { display: "flex", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 11, color: "#7090a0", width: 40 },
  range: { flex: 1, accentColor: "#4db8ff", cursor: "pointer" },
  speedLabel: { fontSize: 11, color: "#7090a0", alignSelf: "flex-end" },
  playButton: {
    fontSize: 16,
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid #334",
    background: "rgba(77,184,255,0.15)",
    color: "#4db8ff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    fontSize: 16,
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid #334",
    background: "transparent",
    color: "#7090a0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
