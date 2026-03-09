import { useState, type FormEvent } from "react";

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
    const filled = sources.filter((s) => s.trim());
    if (filled.length > 0) {
      onProcess(filled);
    }
  }

  const hasSources = sources.some((s) => s.trim());

  return (
    <form className="sources-form" onSubmit={handleSubmit}>
      <div className="sources-form__header">Add sources</div>
      <div className="sources-form__list">
        {sources.map((source, i) => (
          <input
            key={i}
            className="modal__input"
            type="url"
            value={source}
            onChange={(e) => updateSource(i, e.target.value)}
            placeholder={`https://source-${i + 1}.example.com`}
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
          disabled={!hasSources}
          style={{ width: "100%", opacity: hasSources ? 1 : 0.4 }}
        >
          Process
        </button>
      </div>
    </form>
  );
}
