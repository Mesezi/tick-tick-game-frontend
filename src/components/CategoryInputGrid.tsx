import { useState, useEffect, useCallback } from 'react';
import type { CategoryInputGridProps, MappedAnswerResult } from '../types';

/**
 * Category input cards with dark gaming aesthetic.
 * Each category gets its own dark card with label, name, and input.
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

  const getResultForCategory = (category: string): MappedAnswerResult | undefined => {
    return results?.find((r) => r.category === category);
  };

  const getResultIndicator = (result: MappedAnswerResult | undefined) => {
    if (!result) return null;
    switch (result.status) {
      case 'accepted':
        return <span className="text-xs font-bold text-[#00ff88]">✓ {result.points}pts</span>;
      case 'partial':
        return <span className="text-xs font-bold text-[#FF6B35]">~ {result.points}pts</span>;
      case 'rejected':
        return <span className="text-xs font-bold text-[#FF6B35]">✗ {result.points}pts</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      {/* Category input cards */}
      <div className="flex flex-col gap-3">
        {categories.map((category, index) => {
          const result = getResultForCategory(category);

          return (
            <div
              key={category}
              className="rounded-xl bg-[#1a2e1f] border border-[#2a4a32] p-4"
            >
              {/* Category label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#5a7a5a] text-xs uppercase tracking-wide font-bold">
                  Category {index + 1}
                </span>
                <div className="shrink-0">
                  {getResultIndicator(result)}
                </div>
              </div>

              {/* Category name */}
              <p className="text-white font-bold text-sm mb-2">{category}</p>

              {/* Input with letter prefix */}
              <div className="flex items-center gap-2">
                <span className="text-[#00ff88] font-bold text-lg">{letter.toUpperCase()}</span>
                <input
                  id={`category-${category}`}
                  type="text"
                  value={localValues[category] ?? ''}
                  onChange={(e) => handleChange(category, e.target.value)}
                  disabled={disabled}
                  placeholder="Type your answer..."
                  autoComplete="off"
                  className="flex-1 bg-[#0f2518] border border-[#2a4a32] rounded-lg px-3 py-2 text-white font-body text-base focus:border-[#00ff88] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-[#5a7a5a]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
