import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockAppend = vi.fn();

vi.mock("@assistant-ui/react", () => {
  const P = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    useThreadRuntime: () => ({ append: mockAppend }),
    useThread: () => ({ isRunning: false, messages: [] }),
    ThreadPrimitive: {
      Root: P,
      Viewport: P,
      Messages: () => null,
    },
    MessagePrimitive: {
      Root: P,
      Content: () => null,
    },
  };
});

vi.mock("../../src/api/adapter", () => ({
  setApiKey: vi.fn(),
  setSources: vi.fn(),
  setSelectedDemo: vi.fn(),
  validateApiKey: vi.fn().mockResolvedValue({ valid: true }),
  fetchDemos: vi.fn().mockResolvedValue({
    demos: [{ id: "outline", name: "Outline", description: "Process sources into a structured outline" }],
  }),
}));

import { setSources } from "../../src/api/adapter";
import { EnkiModal } from "../../src/components/EnkiModal";

describe("EnkiModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initial render shows API key form", () => {
    render(<EnkiModal />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Enter API key");
    expect(screen.getByPlaceholderText("Enter your API key")).toBeInTheDocument();
  });

  it("after API key submission shows demo selector", async () => {
    const user = userEvent.setup();
    render(<EnkiModal />);

    await user.type(screen.getByPlaceholderText("Enter your API key"), "test-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Select a demo");
    expect(screen.getByText("Select a demo")).toBeInTheDocument();
  });

  it("after demo selection shows sources form", async () => {
    const user = userEvent.setup();
    render(<EnkiModal />);

    // API key step
    await user.type(screen.getByPlaceholderText("Enter your API key"), "test-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

    // Demo selection step - click the demo card
    await user.click(await screen.findByText("Outline"));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Add sources for analysis");
    expect(screen.getByText("Add sources")).toBeInTheDocument();
  });

  it("after sources submission calls setSources and threadRuntime.append", async () => {
    const user = userEvent.setup();
    render(<EnkiModal />);

    // Step through API key
    await user.type(screen.getByPlaceholderText("Enter your API key"), "test-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

    // Step through demo selection
    await user.click(await screen.findByText("Outline"));

    // Fill in a source and submit
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "example.com");
    await user.click(screen.getByRole("button", { name: "Process" }));

    expect(setSources).toHaveBeenCalledWith(["example.com"]);
    expect(mockAppend).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "Analyze sources: example.com" }],
    });
  });
});
