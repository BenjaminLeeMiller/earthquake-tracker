import { Suspense } from "react";
import { GlobeCanvas } from "./components/Globe/GlobeCanvas";
import { StatsPanel } from "./components/Sidebar/StatsPanel";
import { EarthquakeDetail } from "./components/Sidebar/EarthquakeDetail";
import { TimeRangeSlider } from "./components/Controls/TimeRangeSlider";

export default function App() {
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
      {/* Globe canvas — takes remaining space */}
      <div style={{ flex: 1, position: "relative" }}>
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
        <TimeRangeSlider />
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: 300,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflowY: "auto",
          background: "rgba(4,8,16,0.85)",
          borderLeft: "1px solid #1a2a3a",
        }}
      >
        <StatsPanel />
        <EarthquakeDetail />
      </div>
    </div>
  );
}
