import { useState, type FormEvent } from "react";
import { isValidSource } from "../utils/validation";

interface Props {
  onProcess: (sources: string[]) => void;
}

export function SourcesForm({ onProcess }: Props) {
  const [sources, setSources] = useState(["", "", ""]);

  function addSource() {
    setSources((prev) => [...prev, ""]);
  }

  function updateSource(index: number, value: string) {
    setSources((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const valid = sources.filter(isValidSource);
    if (valid.length > 0) {
      onProcess(valid.map((s) => s.trim()));
    }
  }

  const hasValidSources = sources.some(isValidSource);

  return (
    <form className="sources-form" onSubmit={handleSubmit}>
      <div className="sources-form__header">Add sources</div>
      <div className="sources-form__list">
        {sources.map((source, i) => (
          <input
            key={i}
            className="modal__input"
            type="text"
            value={source}
            onChange={(e) => updateSource(i, e.target.value)}
            placeholder={`source-${i + 1}.example.com`}
            autoFocus={i === 0}
          />
        ))}
        <button
          type="button"
          className="sources-form__add"
          onClick={addSource}
        >
          <span className="sources-form__add-icon">+</span>
          Add source
        </button>
      </div>
      <div className="sources-form__footer">
        <button
          type="submit"
          className="modal__btn"
          disabled={!hasValidSources}
          style={{ width: "100%", opacity: hasValidSources ? 1 : 0.4 }}
        >
          Process
        </button>
      </div>
    </form>
  );
}
