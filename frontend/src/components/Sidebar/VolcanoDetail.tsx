import { useAppStore } from "../../store/useAppStore";

function fmtLastEruption(year: number | null): string {
  if (year === null) return "No confirmed Holocene eruption";
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

export function VolcanoDetail() {
  const selected = useAppStore((s) => s.selectedVolcano);
  const selectVolcano = useAppStore((s) => s.selectVolcano);

  if (!selected) return null;

  return (
    <div
      style={{
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        borderRadius: 8,
        flex: 1,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e0f0ff" }}>Selected Volcano</h3>
        <button
          onClick={() => selectVolcano(null)}
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

      <Row label="Name" value={selected.name} />
      <Row label="Country" value={selected.country} />
      <Row label="Type" value={selected.type ?? "Unknown"} />
      <Row
        label="Elevation"
        value={selected.elevationM !== null ? `${selected.elevationM} m` : "Unknown"}
      />
      <Row label="Last eruption" value={fmtLastEruption(selected.lastEruptionYear)} />
      <Row label="Tectonic setting" value={selected.tectonicSetting ?? "Unknown"} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "#7090a0" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#c0d8e8", fontWeight: 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
