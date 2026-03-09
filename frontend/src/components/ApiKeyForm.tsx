import { useState, type FormEvent } from "react";
import { setApiKey } from "../api/adapter";

interface Props {
  onValid: () => void;
}

export function ApiKeyForm({ onValid }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      setError("");
      setApiKey(trimmed);
      onValid();
    } else {
      setError("API key is required");
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
        />
        <button type="submit" className="modal__btn">
          Go
        </button>
      </div>
      {error && <p className="modal__error">{error}</p>}
    </form>
  );
}
