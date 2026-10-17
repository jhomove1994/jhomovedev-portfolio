// Boot-style progress line shown over the still while the 3D scene loads. Presentational: the
// 3D chunk feeds it the asset progress, so this file never touches three.
interface BootLoaderProps {
  /** 0-100. */
  progress: number;
  label: string;
}

export function BootLoader({ progress, label }: BootLoaderProps) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <p className="hero-loader" data-hero-loader aria-hidden="true">
      <span className="hero-loader-prompt">&gt;</span> {label} {percent}%
    </p>
  );
}
