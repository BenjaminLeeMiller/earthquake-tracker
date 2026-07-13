// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobeOpacityToggle } from "./GlobeOpacityToggle";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("GlobeOpacityToggle", () => {
  it("reflects the store's current translucentGlobe value (default off)", () => {
    render(<GlobeOpacityToggle />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("reflects an already-on store value", () => {
    useAppStore.setState({ translucentGlobe: true });
    render(<GlobeOpacityToggle />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("toggling the checkbox updates the store", () => {
    render(<GlobeOpacityToggle />);
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(useAppStore.getState().translucentGlobe).toBe(true);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(useAppStore.getState().translucentGlobe).toBe(false);
  });
});
