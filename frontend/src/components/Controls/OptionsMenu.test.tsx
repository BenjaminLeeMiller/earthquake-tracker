// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsMenu } from "./OptionsMenu";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("OptionsMenu", () => {
  it("collapsed by default, summarizing active toggles (Plate Boundaries defaults on)", () => {
    render(<OptionsMenu />);

    expect(screen.getByText("Options")).toBeInTheDocument();
    expect(screen.getByText("Plate Boundaries")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows 'None' when every toggle is off", () => {
    useAppStore.setState({ faultLayers: { plateBoundaries: false } });
    render(<OptionsMenu />);

    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("expanding reveals all three toggles", () => {
    render(<OptionsMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Options/ }));

    expect(screen.getByText("Translucent Globe")).toBeInTheDocument();
    expect(screen.getByText("Volcanoes")).toBeInTheDocument();
    // translucentGlobe + plateBoundaries + volcanoesVisible
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: /Volcanoes/ })).toBeInTheDocument();
  });

  it("summary reflects live toggle state, not just the initial one", () => {
    render(<OptionsMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Options/ }));

    fireEvent.click(screen.getByRole("checkbox", { name: /Volcanoes/ }));

    // Collapse to check the summary text (still open right now — summary
    // renders regardless of expanded state, so just assert its content).
    expect(screen.getByText("Plate Boundaries, Volcanoes")).toBeInTheDocument();
  });
});
