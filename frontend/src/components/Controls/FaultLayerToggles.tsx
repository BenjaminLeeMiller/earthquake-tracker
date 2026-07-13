import { useAppStore, FAULT_LAYER_LABELS, type FaultLayerKey } from "../../store/useAppStore";

export function FaultLayerToggles() {
  const faultLayers = useAppStore((s) => s.faultLayers);
  const setFaultLayer = useAppStore((s) => s.setFaultLayer);

  return (
    <>
      {(Object.keys(faultLayers) as FaultLayerKey[]).map((key) => (
        <label key={key} style={styles.row}>
          <input
            type="checkbox"
            checked={faultLayers[key]}
            onChange={(e) => setFaultLayer(key, e.target.checked)}
            style={styles.checkbox}
          />
          <span style={styles.label}>{FAULT_LAYER_LABELS[key]}</span>
        </label>
      ))}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  checkbox: { accentColor: "#4db8ff", cursor: "pointer", width: 14, height: 14 },
  label: { fontSize: 12, color: "#c0d8e8", fontWeight: 500 },
};
