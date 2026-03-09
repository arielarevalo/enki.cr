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
  validateApiKey: vi.fn().mockResolvedValue({ valid: true }),
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

  it("after API key submission shows sources form", async () => {
    const user = userEvent.setup();
    render(<EnkiModal />);

    await user.type(screen.getByPlaceholderText("Enter your API key"), "test-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Add sources for analysis");
    expect(screen.getByText("Add sources")).toBeInTheDocument();
  });

  it("after sources submission calls setSources and threadRuntime.append", async () => {
    const user = userEvent.setup();
    render(<EnkiModal />);

    // Step through API key
    await user.type(screen.getByPlaceholderText("Enter your API key"), "test-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

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
