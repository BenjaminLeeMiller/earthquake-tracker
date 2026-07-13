import { CollapsibleSection } from "../Sidebar/CollapsibleSection";
import { GlobeOpacityToggle } from "./GlobeOpacityToggle";
import { FaultLayerToggles } from "./FaultLayerToggles";
import { VolcanoLayerToggle } from "./VolcanoLayerToggle";

/**
 * Groups the display-toggle controls (globe opacity, fault layers,
 * volcanoes) under one collapsible "Options" section instead of each
 * being its own always-visible panel — keeps the sidebar's accordion
 * (see CollapsibleSection/expandedSection) to one entry per logical
 * group of controls. No summary of which toggles are active is shown
 * while collapsed — just the section name.
 */
export function OptionsMenu() {
  return (
    <CollapsibleSection id="options" label="Options">
      <GlobeOpacityToggle />
      <FaultLayerToggles />
      <VolcanoLayerToggle />
    </CollapsibleSection>
  );
}
