import { useEffect } from "react";
import { fetchGlobeStats } from "../../api/earthquakes";
import { useAppStore } from "../../store/useAppStore";

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString();
}

export function StatsPanel() {
  const stats = useAppStore((s) => s.stats);
  const setStats = useAppStore((s) => s.setStats);

  useEffect(() => {
    fetchGlobeStats().then(setStats).catch(console.error);
    const id = setInterval(() => fetchGlobeStats().then(setStats).catch(console.error), 60_000);
    return () => clearInterval(id);
  }, [setStats]);

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
      <Row label="Active layers" value={stats.active_layers.length.toString()} />
      <Row
        label="Last refreshed"
        value={stats.last_fetched ? new Date(stats.last_fetched).toLocaleTimeString() : "—"}
      />
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

const panelStyle: React.CSSProperties = {
  padding: 16,
  background: "rgba(0,0,0,0.7)",
  borderRadius: 8,
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid #1a2a3a",
};
