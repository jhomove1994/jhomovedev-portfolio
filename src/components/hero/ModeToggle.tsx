// Presentational 3D toggle. The label names the action; `aria-pressed` reports whether 3D is on.
interface ModeToggleProps {
  pressed: boolean;
  label: string;
  onToggle: () => void;
}

export function ModeToggle({ pressed, label, onToggle }: ModeToggleProps) {
  return (
    <button
      type="button"
      className="hero-toggle"
      data-hero-toggle
      aria-pressed={pressed}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
