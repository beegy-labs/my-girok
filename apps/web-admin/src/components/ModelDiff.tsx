/**
 * ModelDiff Component
 *
 * Visual diff viewer for authorization model versions
 */

import { useMemo } from 'react';
import { diffLines, Change } from 'diff';

export interface ModelDiffProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

export function ModelDiff({ oldContent, newContent, oldLabel, newLabel }: ModelDiffProps) {
  const changes = useMemo(() => {
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent]);

  const renderLine = (change: Change, index: number) => {
    const isAdded = change.added;
    const isRemoved = change.removed;

    const bgColor = isAdded
      ? 'bg-theme-status-success-background'
      : isRemoved
        ? 'bg-theme-status-error-background'
        : 'bg-theme-background-primary';

    const textColor = isAdded
      ? 'text-theme-status-success-text'
      : isRemoved
        ? 'text-theme-status-error-text'
        : 'text-theme-text-primary';

    const prefix = isAdded ? '+ ' : isRemoved ? '- ' : '  ';

    // Split by lines and render each
    const lines = change.value.split('\n').filter((line, i, arr) => {
      // Keep empty lines except the last one if it's empty
      return i < arr.length - 1 || line.length > 0;
    });

    return lines.map((line, lineIndex) => (
      <div
        key={`${index}-${lineIndex}`}
        className={`px-4 py-1 font-mono text-sm ${bgColor} ${textColor} whitespace-pre`}
      >
        <span className="select-none opacity-50 mr-2">{prefix}</span>
        {line}
      </div>
    ));
  };

  return (
    <div className="border border-theme-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-2 bg-theme-background-secondary border-b border-theme-border-default">
        <div className="px-4 py-2 text-sm font-medium text-theme-text-secondary border-r border-theme-border-default">
          {oldLabel || 'Previous Version'}
        </div>
        <div className="px-4 py-2 text-sm font-medium text-theme-text-secondary">
          {newLabel || 'Current Version'}
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-96 overflow-y-auto bg-theme-background-primary">
        {changes.map((change, index) => renderLine(change, index))}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 bg-theme-background-secondary border-t border-theme-border-default text-xs text-theme-text-tertiary">
        {changes.filter((c) => c.added).length} additions, {changes.filter((c) => c.removed).length}{' '}
        deletions
      </div>
    </div>
  );
}

/**
 * Compact diff summary component
 */
export interface DiffSummaryProps {
  oldContent: string;
  newContent: string;
}

export function DiffSummary({ oldContent, newContent }: DiffSummaryProps) {
  const stats = useMemo(() => {
    const changes = diffLines(oldContent, newContent);
    return {
      additions: changes.filter((c) => c.added).length,
      deletions: changes.filter((c) => c.removed).length,
      unchanged: changes.filter((c) => !c.added && !c.removed).length,
    };
  }, [oldContent, newContent]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-theme-status-success-text">+{stats.additions}</span>
        <span className="text-theme-text-tertiary">additions</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-theme-status-error-text">-{stats.deletions}</span>
        <span className="text-theme-text-tertiary">deletions</span>
      </div>
    </div>
  );
}
