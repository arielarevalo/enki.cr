import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyForm } from "../../src/components/ApiKeyForm";

vi.mock("../../src/api/adapter", () => ({
  setApiKey: vi.fn(),
}));

import { setApiKey } from "../../src/api/adapter";

describe("ApiKeyForm", () => {
  const onValid = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and submit button", () => {
    render(<ApiKeyForm onValid={onValid} />);
    expect(screen.getByPlaceholderText("Enter your API key")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("shows 'API key is required' when submitting empty input", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByText("API key is required")).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("shows 'API key is required' when submitting whitespace", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onValid={onValid} />);

    await user.type(screen.getByPlaceholderText("Enter your API key"), "   ");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByText("API key is required")).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("calls setApiKey and onValid on valid submission", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onValid={onValid} />);

    await user.type(screen.getByPlaceholderText("Enter your API key"), "  my-key  ");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(setApiKey).toHaveBeenCalledWith("my-key");
    expect(onValid).toHaveBeenCalledOnce();
  });

  it("clears error after valid submission", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onValid={onValid} />);

    // First, trigger the error
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(screen.getByText("API key is required")).toBeInTheDocument();

    // Then, submit a valid key
    await user.type(screen.getByPlaceholderText("Enter your API key"), "valid-key");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.queryByText("API key is required")).not.toBeInTheDocument();
  });
});
