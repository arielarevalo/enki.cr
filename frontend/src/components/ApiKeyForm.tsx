import { useState, type FormEvent } from "react";
import { setApiKey, validateApiKey } from "../api/adapter";

interface Props {
  onValid: () => void;
}

export function ApiKeyForm({ onValid }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("API key is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await validateApiKey(trimmed);
      if (!result.valid) {
        setError(result.error ?? "Invalid API key");
        return;
      }
      setApiKey(trimmed);
      onValid();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="api-key-form" onSubmit={handleSubmit}>
      <label className="modal__label" htmlFor="api-key">
        API Key
      </label>
      <div className="api-key-form__row">
        <input
          id="api-key"
          className={`modal__input${error ? " modal__input--error" : ""}`}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your API key"
          autoFocus
          disabled={loading}
        />
        <button type="submit" className="modal__btn" disabled={loading}>
          {loading ? "..." : "Go"}
        </button>
      </div>
      {error && <p className="modal__error">{error}</p>}
    </form>
  );
}
