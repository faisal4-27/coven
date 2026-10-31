import { PIXEL_PALETTE } from './palette';
import type { PixelColorMap, PixelGrid } from './palette';

export interface PixelSpriteProps {
  grid: PixelGrid;
  pixelSize?: number;
  colorOverrides?: PixelColorMap;
  silhouette?: boolean;
  silhouetteColor?: string;
  label?: string;
  className?: string;
}

export function PixelSprite({
  grid,
  pixelSize = 4,
  colorOverrides,
  silhouette = false,
  silhouetteColor = '#0d0714',
  label,
  className,
}: PixelSpriteProps) {
  const height = grid.length;
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);

  if (width === 0 || height === 0) {
    return null;
  }

  const rects: Array<{ x: number; y: number; fill: string }> = [];

  for (let y = 0; y < height; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;

      const resolved = silhouette
        ? silhouetteColor
        : colorOverrides?.[ch] ?? PIXEL_PALETTE[ch];

      if (resolved) {
        rects.push({ x, y, fill: resolved });
      }
    }
  }

  const svgWidth = width * pixelSize;
  const svgHeight = height * pixelSize;
  const combinedClass = className
    ? `witch-pixel-svg ${className}`
    : 'witch-pixel-svg';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={svgWidth}
      height={svgHeight}
      shapeRendering="crispEdges"
      className={combinedClass}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {rects.map((cell, idx) => (
        <rect
          key={`${cell.x}-${cell.y}-${idx}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          fill={cell.fill}
        />
      ))}
    </svg>
  );
}

