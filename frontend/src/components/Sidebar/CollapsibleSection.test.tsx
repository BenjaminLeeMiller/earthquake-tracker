// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "./CollapsibleSection";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("CollapsibleSection", () => {
  it("renders the label and summary, collapsed by default", () => {
    render(
      <CollapsibleSection id="a" label="Time Range" summary="7/6 – 7/13">
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
      <CollapsibleSection id="a" label="Time Range" summary="7/6 – 7/13">
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
      <CollapsibleSection id="a" label="Time Range" summary="7/6 – 7/13">
        <div>hidden content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByText("hidden content")).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("expanding one section collapses another that was open (accordion behavior)", () => {
    render(
      <>
        <CollapsibleSection id="a" label="Section A" summary="summary a">
          <div>content a</div>
        </CollapsibleSection>
        <CollapsibleSection id="b" label="Section B" summary="summary b">
          <div>content b</div>
        </CollapsibleSection>
      </>
    );

    const [buttonA, buttonB] = screen.getAllByRole("button");

    fireEvent.click(buttonA);
    expect(screen.getByText("content a")).toBeInTheDocument();
    expect(buttonA).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(buttonB);
    expect(screen.queryByText("content a")).not.toBeInTheDocument();
    expect(buttonA).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("content b")).toBeInTheDocument();
    expect(buttonB).toHaveAttribute("aria-expanded", "true");
  });
});
