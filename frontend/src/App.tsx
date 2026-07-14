import { Suspense } from "react";
import { GlobeCanvas } from "./components/Globe/GlobeCanvas";
import { EarthquakeDataLoader } from "./components/EarthquakeDataLoader";
import { SidebarToggle } from "./components/SidebarToggle";
import { StatsPanel } from "./components/Sidebar/StatsPanel";
import { DataStatus } from "./components/Sidebar/DataStatus";
import { EarthquakeDetail } from "./components/Sidebar/EarthquakeDetail";
import { VolcanoDetail } from "./components/Sidebar/VolcanoDetail";
import { TimeRangeSlider } from "./components/Controls/TimeRangeSlider";
import { MagnitudeRangeSlider } from "./components/Controls/MagnitudeRangeSlider";
import { PlaybackControls } from "./components/Controls/PlaybackControls";
import { OptionsMenu } from "./components/Controls/OptionsMenu";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000408",
      }}
    >
      {/* Outside the sidebar so collapsing it doesn't unmount the fetch
          lifecycle (renders nothing). */}
      <EarthquakeDataLoader />

      {/* Globe canvas — takes remaining space. minWidth: 0 overrides the
          flex item default of min-width: auto, which would otherwise stop
          this from shrinking below its content's intrinsic size and force
          the sidebar to shrink instead when the window narrows. */}
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#4080a0",
                fontSize: 18,
              }}
            >
              Loading globe…
            </div>
          }
        >
          <GlobeCanvas />
        </Suspense>
        <SidebarToggle />
      </div>

      {/* Right sidebar — flexShrink: 0 keeps this pinned at 300px even as
          the window narrows, so it's the globe (which can shrink freely)
          that gives up space, not the sidebar getting squeezed off screen.
          Collapsible via SidebarToggle for small screens, where even a
          pinned 300px column would leave the globe a sliver. */}
      {sidebarOpen && (
        <div
          className="scrollable-pane"
          style={{
            width: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            overflowY: "auto",
            background: "rgba(4,8,16,0.85)",
            borderLeft: "1px solid #1a2a3a",
          }}
        >
          <StatsPanel />
          <DataStatus />
          <OptionsMenu />
          <TimeRangeSlider />
          <MagnitudeRangeSlider />
          <PlaybackControls />
          <EarthquakeDetail />
          <VolcanoDetail />
        </div>
      )}
    </div>
  );
}
