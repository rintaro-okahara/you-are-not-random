import type { KeyboardEvent } from "react";

export type AppView = "play" | "lab";

interface ViewTabsProps {
  readonly value: AppView;
  readonly onChange: (view: AppView) => void;
}

const VIEWS: readonly AppView[] = ["play", "lab"];

export function ViewTabs({ value, onChange }: ViewTabsProps) {
  const select = (view: AppView) => {
    onChange(view);
    document.getElementById(`${view}-tab`)?.focus();
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AppView,
  ) => {
    const index = VIEWS.indexOf(view);
    let next: AppView | undefined;
    if (event.key === "ArrowRight") {
      next = VIEWS[(index + 1) % VIEWS.length];
    } else if (event.key === "ArrowLeft") {
      next = VIEWS[(index - 1 + VIEWS.length) % VIEWS.length];
    } else if (event.key === "Home") {
      next = VIEWS[0];
    } else if (event.key === "End") {
      next = VIEWS.at(-1);
    }
    if (next !== undefined) {
      event.preventDefault();
      select(next);
    }
  };

  return (
    <div className="view-tabs" role="tablist" aria-label="表示を切り替える">
      {VIEWS.map((view) => {
        const label = view.toUpperCase();
        const selected = value === view;
        return (
          <button
            id={`${view}-tab`}
            key={view}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${view}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(view)}
            onKeyDown={(event) => onKeyDown(event, view)}
          >
            <span aria-hidden="true">0{view === "play" ? "1" : "2"}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
