import React from 'react';

interface GridOverlayProps {
  width: number;
  height: number;
  columns?: number;
  rows?: number;
  color?: string;
}

export default function GridOverlay({
  width,
  height,
  columns = 3,
  rows = 3,
  color = 'rgba(99,102,241,0.2)',
}: GridOverlayProps) {
  const lines: React.ReactNode[] = [];

  // Vertical lines
  for (let c = 1; c < columns; c++) {
    const x = (width / columns) * c;
    lines.push(
      <line key={`v${c}`} x1={x} y1={0} x2={x} y2={height}
        stroke={color} strokeWidth={0.5} />
    );
  }

  // Horizontal lines
  for (let r = 1; r < rows; r++) {
    const y = (height / rows) * r;
    lines.push(
      <line key={`h${r}`} x1={0} y1={y} x2={width} y2={y}
        stroke={color} strokeWidth={0.5} />
    );
  }

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
      {lines}
    </svg>
  );
}
