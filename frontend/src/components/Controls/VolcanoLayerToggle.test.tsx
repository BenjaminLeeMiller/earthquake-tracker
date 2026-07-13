// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VolcanoLayerToggle } from "./VolcanoLayerToggle";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("VolcanoLayerToggle", () => {
  it("reflects the store's current volcanoesVisible value (default off)", () => {
    render(<VolcanoLayerToggle />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Volcanoes")).toBeInTheDocument();
  });

  it("toggling the checkbox updates the store", () => {
    render(<VolcanoLayerToggle />);
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(useAppStore.getState().volcanoesVisible).toBe(true);
  });
});
