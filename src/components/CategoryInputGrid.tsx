import { useState, useEffect, useCallback } from 'react';
import type { CategoryInputGridProps, MappedAnswerResult } from '../types';

/**
 * CategoryInputGrid — exercise-book ruled cards.
 * Each category gets its own notebook-paper card with a biro-ink input.
 */
export function CategoryInputGrid({
  categories,
  letter,
  disabled,
  answers,
  results,
  onAnswerChange,
}: CategoryInputGridProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalValues(answers);
  }, [answers]);

  const handleChange = useCallback(
    (category: string, value: string) => {
      setLocalValues((prev) => ({ ...prev, [category]: value }));
      onAnswerChange(category, value);
    },
    [onAnswerChange]
  );

  const getResultForCategory = (category: string): MappedAnswerResult | undefined =>
    results?.find((r) => r.category === category);

  const getResultIndicator = (result: MappedAnswerResult | undefined) => {
    if (!result) return null;
    switch (result.status) {
      case 'accepted':
        return (
          <span className="text-sm font-bold font-script text-chalk-mark">
            ✓ {result.points}pts
          </span>
        );
      case 'partial':
        return (
          <span className="text-sm font-bold font-script text-school-amber">
            ~ {result.points}pts
          </span>
        );
      case 'rejected':
        return (
          <span className="text-sm font-bold font-script text-school-red">
            ✗ {result.points}pts
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex flex-col gap-2.5">
        {categories.map((category, index) => {
          const result = getResultForCategory(category);
          const filled = !!(localValues[category] ?? '').trim();

          return (
            <div
              key={category}
              className="input-ruled"
              style={{
                border: `2px solid ${filled ? 'rgba(107,68,35,0.4)' : '#c8b89a'}`,
                boxShadow: filled ? '0 0 0 2px rgba(107,68,35,0.1)' : 'none',
                opacity: disabled ? 0.7 : 1,
              }}
            >
              <div className="px-3.5 pt-2 pb-2">
                {/* Category label row */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className="label-section">
                    {index + 1}. {category}
                  </span>
                  <div className="shrink-0">{getResultIndicator(result)}</div>
                </div>

                {/* Input row: letter prefix + text field */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg shrink-0 font-display text-chalk-mark">
                    {letter.toUpperCase()}
                  </span>
                  <input
                    id={`category-${category}`}
                    type="text"
                    value={localValues[category] ?? ''}
                    onChange={(e) => handleChange(category, e.target.value)}
                    disabled={disabled}
                    placeholder="Type your answer..."
                    autoComplete="off"
                    className="flex-1 bg-transparent outline-none font-bold font-hand text-[17px] text-ink-dark"
                    style={{ caretColor: '#6b4423' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
