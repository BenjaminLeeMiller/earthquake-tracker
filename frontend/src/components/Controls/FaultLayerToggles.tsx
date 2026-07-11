import { useAppStore, type FaultLayerKey } from "../../store/useAppStore";
import { panelStyle } from "../Sidebar/panelStyle";

// Add a label here whenever a new key is added to FaultLayerKey — that's
// the only other change needed for a new fault dataset to get its own
// checkbox row, styled like the app's other toggles (not nested behind
// a shared menu).
const FAULT_LAYER_LABELS: Record<FaultLayerKey, string> = {
  plateBoundaries: "Plate Boundaries",
};

export function FaultLayerToggles() {
  const faultLayers = useAppStore((s) => s.faultLayers);
  const setFaultLayer = useAppStore((s) => s.setFaultLayer);

  return (
    <>
      {(Object.keys(faultLayers) as FaultLayerKey[]).map((key) => (
        <div key={key} style={panelStyle}>
          <label style={styles.row}>
            <input
              type="checkbox"
              checked={faultLayers[key]}
              onChange={(e) => setFaultLayer(key, e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.label}>{FAULT_LAYER_LABELS[key]}</span>
          </label>
        </div>
      ))}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  checkbox: { accentColor: "#4db8ff", cursor: "pointer", width: 14, height: 14 },
  label: { fontSize: 12, color: "#c0d8e8", fontWeight: 500 },
};
