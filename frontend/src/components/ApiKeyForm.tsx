import { useState, type FormEvent } from "react";

interface Props {
  onValid: () => void;
}

export function ApiKeyForm({ onValid }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim() === "test") {
      setError("");
      onValid();
    } else {
      setError('Invalid API key. Try "test".');
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
