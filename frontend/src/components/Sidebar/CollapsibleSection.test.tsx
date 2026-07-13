// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders the label and summary, collapsed by default", () => {
    render(
      <CollapsibleSection label="Time Range" summary="7/6 – 7/13">
        <div>hidden content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText("Time Range")).toBeInTheDocument();
    expect(screen.getByText("7/6 – 7/13")).toBeInTheDocument();
    expect(screen.queryByText("hidden content")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("expands on click, revealing children and flipping the chevron", () => {
    render(
      <CollapsibleSection label="Time Range" summary="7/6 – 7/13">
        <div>hidden content</div>
      </CollapsibleSection>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("hidden content")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("collapses again on a second click", () => {
    render(
      <CollapsibleSection label="Time Range" summary="7/6 – 7/13">
        <div>hidden content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByText("hidden content")).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("honors defaultExpanded", () => {
    render(
      <CollapsibleSection label="Time Range" summary="7/6 – 7/13" defaultExpanded>
        <div>hidden content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText("hidden content")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });
});
