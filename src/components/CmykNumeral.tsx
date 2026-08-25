import type { CSSProperties } from 'react';

// A display numeral set as three misregistered process plates (the
// design system's ".cmyk-num" construction — see src/styles/tokens.css).
export function CmykNumeral({ value, style }: { value: string | number; style?: CSSProperties }) {
  return (
    <span className="cmyk-num" style={style}>
      <span className="paper">{value}</span>
      <span className="plate plate-c" aria-hidden="true">{value}</span>
      <span className="plate plate-m" aria-hidden="true">{value}</span>
      <span className="plate plate-y" aria-hidden="true">{value}</span>
    </span>
  );
}
