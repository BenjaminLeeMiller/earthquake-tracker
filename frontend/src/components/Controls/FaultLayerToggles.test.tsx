// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FaultLayerToggles } from "./FaultLayerToggles";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("FaultLayerToggles", () => {
  it("renders one row per fault layer key, checked per store state", () => {
    render(<FaultLayerToggles />);

    expect(screen.getByText("Plate Boundaries")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked(); // plateBoundaries defaults true
  });

  it("toggling a row's checkbox updates only that key in the store", () => {
    render(<FaultLayerToggles />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(useAppStore.getState().faultLayers).toEqual({ plateBoundaries: false });
  });
});
