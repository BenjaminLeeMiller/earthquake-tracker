import type { EarthquakeOut } from "../../api/earthquakes";
import { magColor } from "../../utils/magnitude";

interface Props {
  earthquakes: EarthquakeOut[];
}

export function EarthquakeList({ earthquakes }: Props) {
  if (earthquakes.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {earthquakes.map((eq) => (
        <div
          key={eq.id}
          style={{
            padding: "8px 10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            borderLeft: `3px solid ${magColor(eq.magnitude)}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: magColor(eq.magnitude), fontSize: 15 }}>
              M{eq.magnitude?.toFixed(1) ?? "?"}
            </span>
            <span style={{ fontSize: 11, color: "#506070" }}>
              {eq.occurred_at ? new Date(eq.occurred_at).toLocaleString() : "—"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#90a8b8" }}>{eq.place ?? "Unknown location"}</div>
          {eq.depth_km != null && (
            <div style={{ fontSize: 11, color: "#506070", marginTop: 2 }}>
              Depth: {eq.depth_km.toFixed(1)} km
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
