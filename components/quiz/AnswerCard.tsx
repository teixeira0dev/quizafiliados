'use client';

interface Props {
  html: string;
  selected: boolean;
  onClick: () => void;
}

export default function AnswerCard({ html, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      data-testid="answer-card"
      aria-pressed={selected}
      className={`answer-card${selected ? ' answer-card--selected' : ''}`}
    >
      <span className={`answer-card__radio${selected ? ' answer-card__radio--selected' : ''}`}>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <span
        className="rt answer-card__text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </button>
  );
}
