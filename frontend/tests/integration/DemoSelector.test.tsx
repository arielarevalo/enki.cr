import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api/adapter", () => ({
  fetchDemos: vi.fn(),
  setSelectedDemo: vi.fn(),
}));

import { fetchDemos, setSelectedDemo } from "../../src/api/adapter";
import { DemoSelector } from "../../src/components/DemoSelector";

describe("DemoSelector", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shows loading state initially", () => {
    (fetchDemos as any).mockReturnValue(new Promise(() => {})); // never resolves
    render(<DemoSelector onSelect={() => {}} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders demo cards after loading", async () => {
    (fetchDemos as any).mockResolvedValue({
      demos: [
        { id: "outline", name: "Outline", description: "Process sources" },
        { id: "other", name: "Other", description: "Other demo" },
      ],
    });
    render(<DemoSelector onSelect={() => {}} />);
    expect(await screen.findByText("Outline")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("calls setSelectedDemo and onSelect when card is clicked", async () => {
    const onSelect = vi.fn();
    const demo = { id: "outline", name: "Outline", description: "Process sources" };
    (fetchDemos as any).mockResolvedValue({ demos: [demo] });
    const user = userEvent.setup();

    render(<DemoSelector onSelect={onSelect} />);
    await user.click(await screen.findByText("Outline"));

    expect(setSelectedDemo).toHaveBeenCalledWith(demo);
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows error message on failure", async () => {
    (fetchDemos as any).mockResolvedValue({ demos: [], error: "Unauthorized" });
    render(<DemoSelector onSelect={() => {}} />);
    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
  });
});
