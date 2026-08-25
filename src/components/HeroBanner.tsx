import { useState } from 'react';

interface HeroBannerProps {
  height: number;
  kicker: string;
  title: string;
  titleSize: number;
  src?: string;
  alt: string;
}

// The full-width photo banner used on the home and about pages. Falls
// back to a plain paper-tinted gradient if the source image 404s (the
// design import's two hero photographs exceeded the design MCP's 256 KiB
// file-read cap and could not be recovered — see README.md).
export function HeroBanner({ height, kicker, title, titleSize, src, alt }: HeroBannerProps) {
  const [broken, setBroken] = useState(!src);
  return (
    <div className="hero-banner" style={{ height }}>
      {!broken && src ? (
        <img src={src} alt={alt} onError={() => setBroken(true)} />
      ) : (
        <div className="hero-banner__fallback" role="img" aria-label={alt} />
      )}
      <div className="hero-banner__caption">
        <div className="hero-banner__kicker">{kicker}</div>
        <div className="hero-banner__title" style={{ fontSize: titleSize }}>{title}</div>
      </div>
    </div>
  );
}
