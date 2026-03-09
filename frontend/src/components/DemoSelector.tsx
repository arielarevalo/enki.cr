import { useEffect, useState } from "react";
import { fetchDemos, setSelectedDemo, type Demo } from "../api/adapter";

interface DemoSelectorProps {
  onSelect: () => void;
}

export function DemoSelector({ onSelect }: DemoSelectorProps) {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemos().then((result) => {
      setDemos(result.demos);
      if (result.error) setError(result.error);
      setLoading(false);
    });
  }, []);

  function handleSelect(demo: Demo) {
    setSelectedDemo(demo);
    onSelect();
  }

  if (loading) {
    return (
      <div className="demo-selector">
        <div className="demo-selector__header">Select a demo</div>
        <div className="demo-selector__loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="demo-selector">
        <div className="demo-selector__header">Select a demo</div>
        <div className="modal__error">{error}</div>
      </div>
    );
  }

  return (
    <div className="demo-selector">
      <div className="demo-selector__header">Select a demo</div>
      <div className="demo-selector__list">
        {demos.map((demo) => (
          <button
            key={demo.id}
            className="demo-selector__card"
            onClick={() => handleSelect(demo)}
          >
            <span className="demo-selector__card-name">{demo.name}</span>
            <span className="demo-selector__card-desc">{demo.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
