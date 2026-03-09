import ReactMarkdown from "react-markdown";
import { mockFinalMarkdown } from "../mock/data";

interface Props {
  expanded: boolean;
  onToggleExpand: () => void;
}

export function FinalResult({ expanded, onToggleExpand }: Props) {
  return (
    <div className="result">
      <div className="result__header">
        <span className="result__title">Result</span>
        <button
          className="result__expand"
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse result" : "Expand result"}
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "⊖" : "⊕"}
        </button>
      </div>
      <div className="result__body">
        <div className="result__markdown">
          <ReactMarkdown>{mockFinalMarkdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
