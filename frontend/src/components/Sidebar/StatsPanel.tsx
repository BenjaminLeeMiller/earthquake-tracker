import { useEffect, useState } from "react";
import { fetchGlobeStats, triggerRefresh } from "../../api/earthquakes";
import { useAppStore } from "../../store/useAppStore";
import { panelStyle } from "./panelStyle";

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString();
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StatsPanel() {
  const stats = useAppStore((s) => s.stats);
  const setStats = useAppStore((s) => s.setStats);
  const refreshing = useAppStore((s) => s.refreshing);
  const setRefreshing = useAppStore((s) => s.setRefreshing);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobeStats().then(setStats).catch(console.error);
    const id = setInterval(() => fetchGlobeStats().then(setStats).catch(console.error), 60_000);
    return () => clearInterval(id);
  }, [setStats]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshError(null);
    setRefreshing(true);
    const before = stats?.last_fetched ?? null;
    try {
      await triggerRefresh();

      // The refresh runs as a backend background task and returns
      // immediately, so poll stats until last_fetched actually moves (or we
      // give up) before telling the globe to reload the quake list.
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let latest = await fetchGlobeStats();
      while (latest.last_fetched === before && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        latest = await fetchGlobeStats();
      }
      setStats(latest);
      bumpDataVersion();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (!stats) {
    return (
      <div style={panelStyle}>
        <p style={{ color: "#506070", fontSize: 13 }}>Loading stats…</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e0f0ff", marginBottom: 10 }}>
        🌍 Earthquake Tracker
      </h2>
      <Row label="Total events" value={stats.total_earthquakes.toLocaleString()} />
      <Row label="Date range" value={`${fmt(stats.earliest)} – ${fmt(stats.latest)}`} />
      <Row
        label="Last refreshed"
        value={stats.last_fetched ? new Date(stats.last_fetched).toLocaleTimeString() : "—"}
      />
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          marginTop: 10,
          width: "100%",
          fontSize: 12,
          fontWeight: 600,
          padding: "7px 0",
          borderRadius: 6,
          border: "1px solid #334",
          background: refreshing ? "rgba(77,184,255,0.05)" : "rgba(77,184,255,0.15)",
          color: refreshing ? "#4d6b80" : "#4db8ff",
          cursor: refreshing ? "default" : "pointer",
        }}
      >
        {refreshing ? "Refreshing from USGS…" : "⟳ Refresh from USGS"}
      </button>
      {refreshError && (
        <p style={{ color: "#ff6b6b", fontSize: 11, marginTop: 6 }}>{refreshError}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "#7090a0" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#c0d8e8", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
