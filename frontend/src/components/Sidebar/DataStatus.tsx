import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "./panelStyle";

/**
 * Surfaces the shared quake-dataset fetch state: a loading note during the
 * initial load (reloads keep showing the previous data, so no flicker) and
 * an error banner with a retry button when the fetch fails — previously a
 * failed fetch left the globe silently empty.
 */
export function DataStatus() {
  const quakesLoading = useAppStore((s) => s.quakesLoading);
  const quakesError = useAppStore((s) => s.quakesError);
  const hasData = useAppStore((s) => s.earthquakes.length > 0);
  const loadEarthquakes = useAppStore((s) => s.loadEarthquakes);

  if (quakesError) {
    return (
      <div style={{ ...panelStyle, ...styles.errorPanel }}>
        <p style={styles.errorText}>Failed to load earthquakes: {quakesError}</p>
        <button style={styles.retryBtn} onClick={() => loadEarthquakes()}>
          Retry
        </button>
      </div>
    );
  }

  if (quakesLoading && !hasData) {
    return (
      <div style={panelStyle}>
        <p style={styles.loadingText}>Loading earthquakes…</p>
      </div>
    );
  }

  return null;
}

const styles: Record<string, React.CSSProperties> = {
  errorPanel: { borderLeft: "3px solid #ff6b6b" },
  errorText: { color: "#ff6b6b", fontSize: 12, marginBottom: 8 },
  loadingText: { color: "#506070", fontSize: 13 },
  retryBtn: {
    fontSize: 11,
    color: "#c0d8e8",
    background: "rgba(255,107,107,0.15)",
    border: "1px solid #664",
    borderRadius: 4,
    padding: "3px 10px",
    cursor: "pointer",
  },
};
