import { useRef, useState, type CSSProperties } from 'react';

type Shape = 'rect' | 'rounded' | 'circle' | 'pill';

interface ImageSlotProps {
  id: string;
  shape?: Shape;
  radius?: number;
  placeholder?: string;
  src?: string;
  style?: CSSProperties;
}

function shapeStyle(shape: Shape, radius: number): CSSProperties {
  if (shape === 'circle') return { borderRadius: '50%' };
  if (shape === 'pill') return { borderRadius: '999px' };
  if (shape === 'rect') return { borderRadius: 0 };
  return { borderRadius: radius };
}

// A simplified, dependency-free stand-in for the Claude Design
// `<image-slot>` custom element (design-reference/image-slot.js), which
// only works inside the design tool's own runtime. This version keeps the
// same drop-a-photo interaction — click or drag a file onto the slot — and
// keeps it in memory for the session, so the layout and empty-state look
// the same without needing that runtime.
export function ImageSlot({ id, shape = 'rounded', radius = 12, placeholder = 'Drop an image', src, style }: ImageSlotProps) {
  const [dropped, setDropped] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = dropped || src;

  const acceptFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setDropped(url);
  };

  return (
    <div
      className={`image-slot${dragOver ? ' image-slot--dragover' : ''}`}
      style={{ ...shapeStyle(shape, radius), ...style }}
      data-slot-id={id}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files[0]); }}
      role="button"
      aria-label={placeholder}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      {shown ? <img src={shown} alt="" /> : <span>{placeholder}</span>}
    </div>
  );
}
