// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarToggle } from "./SidebarToggle";
import { useAppStore } from "../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("SidebarToggle", () => {
  it("offers to collapse when the sidebar is open (default)", () => {
    render(<SidebarToggle />);
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("clicking collapses, then offers to reopen", () => {
    render(<SidebarToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    expect(screen.getByRole("button", { name: "Open sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });
});
