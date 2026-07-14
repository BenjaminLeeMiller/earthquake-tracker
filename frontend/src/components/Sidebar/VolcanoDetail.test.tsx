// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VolcanoDetail } from "./VolcanoDetail";
import { useAppStore } from "../../store/useAppStore";
import type { VolcanoRecord } from "../../types/volcano";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

const VOLCANO: VolcanoRecord = {
  id: 1,
  name: "Test Peak",
  country: "Testland",
  type: "Stratovolcano",
  elevationM: 3357,
  lastEruptionYear: 2015,
  tectonicSetting: "Subduction zone",
  lat: 37.75,
  lon: 15.0,
};

describe("VolcanoDetail", () => {
  it("renders nothing when no volcano is selected", () => {
    const { container } = render(<VolcanoDetail />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selected volcano's details", () => {
    useAppStore.getState().selectVolcano(VOLCANO);
    render(<VolcanoDetail />);

    expect(screen.getByText("Selected Volcano")).toBeInTheDocument();
    expect(screen.getByText("Test Peak")).toBeInTheDocument();
    expect(screen.getByText("Testland")).toBeInTheDocument();
    expect(screen.getByText("Stratovolcano")).toBeInTheDocument();
    expect(screen.getByText("3357 m")).toBeInTheDocument();
    expect(screen.getByText("2015 CE")).toBeInTheDocument();
    expect(screen.getByText("Subduction zone")).toBeInTheDocument();
  });

  it("formats a negative lastEruptionYear as BCE", () => {
    useAppStore.getState().selectVolcano({ ...VOLCANO, lastEruptionYear: -8300 });
    render(<VolcanoDetail />);
    expect(screen.getByText("8300 BCE")).toBeInTheDocument();
  });

  it("shows a fallback message when lastEruptionYear is null", () => {
    useAppStore.getState().selectVolcano({ ...VOLCANO, lastEruptionYear: null });
    render(<VolcanoDetail />);
    expect(screen.getByText("No confirmed Holocene eruption")).toBeInTheDocument();
  });

  it("shows 'Unknown' for null type/elevation/tectonicSetting", () => {
    useAppStore.getState().selectVolcano({
      ...VOLCANO,
      type: null,
      elevationM: null,
      tectonicSetting: null,
    });
    render(<VolcanoDetail />);
    expect(screen.getAllByText("Unknown")).toHaveLength(3);
  });

  it("clicking the close button clears the selection", () => {
    useAppStore.getState().selectVolcano(VOLCANO);
    render(<VolcanoDetail />);

    fireEvent.click(screen.getByText("✕"));

    expect(useAppStore.getState().selectedVolcano).toBeNull();
  });

  it("sizes to its content instead of its own flex/scroll region", () => {
    // Regression test: flex + overflowY here previously collapsed this
    // panel's min-height to 0 inside the sidebar's flex column, trapping
    // overflow in a nested scroll region the outer sidebar scroll couldn't
    // reach (see panelStyle.ts, which this must keep using instead).
    useAppStore.getState().selectVolcano(VOLCANO);
    const { container } = render(<VolcanoDetail />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.style.flex).toBe("");
    expect(wrapper.style.overflowY).toBe("");
  });
});
