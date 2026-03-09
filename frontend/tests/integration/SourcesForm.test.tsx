import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesForm } from "../../src/components/SourcesForm";

describe("SourcesForm", () => {
  const onProcess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 3 initial inputs", () => {
    render(<SourcesForm onProcess={onProcess} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
  });

  it("'Add source' adds a new input", async () => {
    const user = userEvent.setup();
    render(<SourcesForm onProcess={onProcess} />);

    await user.click(screen.getByText("Add source"));
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("submit button disabled with no valid sources", () => {
    render(<SourcesForm onProcess={onProcess} />);
    expect(screen.getByRole("button", { name: "Process" })).toBeDisabled();
  });

  it("submit button enabled with a valid source", async () => {
    const user = userEvent.setup();
    render(<SourcesForm onProcess={onProcess} />);

    await user.type(screen.getAllByRole("textbox")[0], "example.com");
    expect(screen.getByRole("button", { name: "Process" })).toBeEnabled();
  });

  it("onProcess called with trimmed valid sources only", async () => {
    const user = userEvent.setup();
    render(<SourcesForm onProcess={onProcess} />);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "  example.com  ");
    await user.type(inputs[1], "nodot");
    await user.type(inputs[2], "other.org/path");

    await user.click(screen.getByRole("button", { name: "Process" }));

    expect(onProcess).toHaveBeenCalledWith(["example.com", "other.org/path"]);
  });
});
