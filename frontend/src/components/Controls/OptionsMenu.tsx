import { useAppStore, FAULT_LAYER_LABELS, type FaultLayerKey } from "../../store/useAppStore";
import { CollapsibleSection } from "../Sidebar/CollapsibleSection";
import { GlobeOpacityToggle } from "./GlobeOpacityToggle";
import { FaultLayerToggles } from "./FaultLayerToggles";
import { VolcanoLayerToggle } from "./VolcanoLayerToggle";

/**
 * Groups the display-toggle controls (globe opacity, fault layers,
 * volcanoes) under one collapsible "Options" section instead of each
 * being its own always-visible panel — keeps the sidebar's accordion
 * (see CollapsibleSection/expandedSection) to one entry per logical
 * group of controls.
 */
export function OptionsMenu() {
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);
  const faultLayers = useAppStore((s) => s.faultLayers);
  const volcanoesVisible = useAppStore((s) => s.volcanoesVisible);

  const activeLabels = [
    translucentGlobe ? "Translucent Globe" : null,
    ...(Object.keys(faultLayers) as FaultLayerKey[])
      .filter((key) => faultLayers[key])
      .map((key) => FAULT_LAYER_LABELS[key]),
    volcanoesVisible ? "Volcanoes" : null,
  ].filter((label): label is string => label !== null);

  return (
    <CollapsibleSection
      id="options"
      label="Options"
      summary={activeLabels.length > 0 ? activeLabels.join(", ") : "None"}
    >
      <GlobeOpacityToggle />
      <FaultLayerToggles />
      <VolcanoLayerToggle />
    </CollapsibleSection>
  );
}
