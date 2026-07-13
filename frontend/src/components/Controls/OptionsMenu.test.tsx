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
  it("collapsed by default, showing no summary of active toggles", () => {
    render(<OptionsMenu />);

    expect(screen.getByText("Options")).toBeInTheDocument();
    expect(screen.queryByText("Plate Boundaries")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("expanding reveals all three toggles", () => {
    render(<OptionsMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Options/ }));

    expect(screen.getByText("Translucent Globe")).toBeInTheDocument();
    expect(screen.getByText("Plate Boundaries")).toBeInTheDocument();
    expect(screen.getByText("Volcanoes")).toBeInTheDocument();
    // translucentGlobe + plateBoundaries + volcanoesVisible
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });
});
