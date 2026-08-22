import React from 'react';

interface FaceGuideOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  faceGuideScale: number;
  faceGuideYOffset: number;
  shoulderGuideYOffset?: number;
  showFaceGuide: boolean;
  showSafeArea: boolean;
  showEyeLine: boolean;
  showShoulderGuide?: boolean;
  eyeYRatio: number;    // 0–1 from top of crop area
  isCropPanel: boolean;
  onHandleMouseDown?: (handle: string, e: React.MouseEvent) => void;
  onCropBoxMouseDown?: (e: React.MouseEvent) => void;
}

export default function FaceGuideOverlay({
  canvasWidth, canvasHeight,
  cropX, cropY, cropW, cropH,
  faceGuideScale, faceGuideYOffset,
  shoulderGuideYOffset = 0,
  showFaceGuide, showSafeArea, showEyeLine,
  showShoulderGuide = true,
  eyeYRatio,
  isCropPanel,
  onHandleMouseDown,
  onCropBoxMouseDown,
}: FaceGuideOverlayProps) {
  const faceCenterX = cropX + cropW / 2;
  const faceCenterY = cropY + cropH * 0.42 + faceGuideYOffset;
  const faceRadius = (cropH * faceGuideScale) / 2;

  const eyeLineY = cropY + cropH * eyeYRatio + faceGuideYOffset;
  const shoulderY = cropY + cropH * 0.76 + shoulderGuideYOffset;

  const HANDLES = [
    { id: 'nw', x: cropX, y: cropY, cursor: 'cursor-nwse-resize' },
    { id: 'n',  x: cropX + cropW / 2, y: cropY, cursor: 'cursor-ns-resize' },
    { id: 'ne', x: cropX + cropW, y: cropY, cursor: 'cursor-nesw-resize' },
    { id: 'w',  x: cropX, y: cropY + cropH / 2, cursor: 'cursor-ew-resize' },
    { id: 'e',  x: cropX + cropW, y: cropY + cropH / 2, cursor: 'cursor-ew-resize' },
    { id: 'sw', x: cropX, y: cropY + cropH, cursor: 'cursor-nesw-resize' },
    { id: 's',  x: cropX + cropW / 2, y: cropY + cropH, cursor: 'cursor-ns-resize' },
    { id: 'se', x: cropX + cropW, y: cropY + cropH, cursor: 'cursor-nwse-resize' },
  ];

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ overflow: 'visible' }}
    >
      {/* Safe Area Rectangle */}
      {showSafeArea && (
        <>
          {/* Darkened outer region */}
          <defs>
            <mask id="safe-area-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect x={cropX} y={cropY} width={cropW} height={cropH} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(0,0,0,0.45)"
            mask="url(#safe-area-mask)"
          />

          {/* Interactive Crop Box Interior (for moving crop box in Crop Tab) */}
          <rect
            x={cropX}
            y={cropY}
            width={cropW}
            height={cropH}
            fill="transparent"
            className={isCropPanel ? "cursor-move pointer-events-auto" : "pointer-events-none"}
            onMouseDown={isCropPanel ? onCropBoxMouseDown : undefined}
          />

          {/* Crop border */}
          <rect
            x={cropX} y={cropY} width={cropW} height={cropH}
            fill="none"
            stroke="rgba(99,102,241,0.9)"
            strokeWidth={2}
            strokeDasharray="6 4"
            className="pointer-events-none"
          />

          {/* Corner marks */}
          {[
            [cropX, cropY], [cropX + cropW, cropY],
            [cropX, cropY + cropH], [cropX + cropW, cropY + cropH]
          ].map(([cx, cy], i) => {
            const dx = i % 2 === 0 ? 1 : -1;
            const dy = i < 2 ? 1 : -1;
            return (
              <g key={i} className="pointer-events-none">
                <line x1={cx} y1={cy} x2={cx + dx * 14} y2={cy} stroke="#818cf8" strokeWidth={3} />
                <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 14} stroke="#818cf8" strokeWidth={3} />
              </g>
            );
          })}

          {/* 8 Interactive Crop Box Handles (ONLY IN CROP PANEL) */}
          {isCropPanel && HANDLES.map((h) => (
            <g
              key={h.id}
              className={`${h.cursor} pointer-events-auto`}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (onHandleMouseDown) onHandleMouseDown(h.id, e);
              }}
            >
              {/* Invisible large hit area (16px radius) to prevent cursor slips */}
              <circle cx={h.x} cy={h.y} r={16} fill="transparent" />
              {/* Visible stable handle dot */}
              <circle
                cx={h.x}
                cy={h.y}
                r={7}
                fill="#6366f1"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          ))}
        </>
      )}

      {/* Face oval guide (ONLY IN TEMPLATE & OTHER PANELS, HIDDEN IN CROP PANEL) */}
      {!isCropPanel && showFaceGuide && (
        <g className="pointer-events-none">
          <ellipse
            cx={faceCenterX} cy={faceCenterY}
            rx={faceRadius * 0.72} ry={faceRadius}
            fill="none"
            stroke="rgba(34,197,94,0.7)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          {/* Center cross */}
          <line
            x1={faceCenterX - 8} y1={faceCenterY}
            x2={faceCenterX + 8} y2={faceCenterY}
            stroke="rgba(34,197,94,0.6)" strokeWidth={1}
          />
          <line
            x1={faceCenterX} y1={faceCenterY - 8}
            x2={faceCenterX} y2={faceCenterY + 8}
            stroke="rgba(34,197,94,0.6)" strokeWidth={1}
          />
          {/* Label */}
          <text
            x={faceCenterX + faceRadius * 0.72 + 4}
            y={faceCenterY + 4}
            fill="rgba(34,197,94,0.9)"
            fontSize="9"
            fontWeight="600"
          >
            FACE
          </text>
        </g>
      )}

      {/* Eye Line Guide (AVAILABLE IN BOTH CROP AND TEMPLATE PANELS) */}
      {showEyeLine && (
        <g className="pointer-events-none">
          <line
            x1={cropX}
            y1={eyeLineY}
            x2={cropX + cropW}
            y2={eyeLineY}
            stroke="rgba(251,191,36,0.7)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={cropX + 3}
            y={eyeLineY - 3}
            fill="rgba(251,191,36,0.9)"
            fontSize="8"
            fontWeight="600"
          >
            EYE LINE
          </text>
        </g>
      )}

      {/* Shoulder Leveling & Head Symmetry Guides (ONLY IN CROP PANEL) */}
      {isCropPanel && showShoulderGuide && (
        <g className="pointer-events-none">
          {/* Vertical Center Symmetry Line */}
          <line
            x1={cropX + cropW / 2}
            y1={cropY}
            x2={cropX + cropW / 2}
            y2={cropY + cropH}
            stroke="rgba(168,85,247,0.75)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={cropX + cropW / 2 + 4}
            y={cropY + 12}
            fill="rgba(168,85,247,0.95)"
            fontSize="8"
            fontWeight="bold"
          >
            CENTER SYMMETRY
          </text>

          {/* Horizontal Shoulder Level Line */}
          <line
            x1={cropX}
            y1={shoulderY}
            x2={cropX + cropW}
            y2={shoulderY}
            stroke="rgba(6,182,212,0.85)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          {/* Left & Right Shoulder Target Crosshairs */}
          {[cropX + cropW * 0.25, cropX + cropW * 0.75].map((sx, idx) => (
            <g key={idx}>
              <circle cx={sx} cy={shoulderY} r={4} fill="none" stroke="rgba(6,182,212,0.9)" strokeWidth={1.5} />
              <line x1={sx - 8} y1={shoulderY} x2={sx + 8} y2={shoulderY} stroke="rgba(6,182,212,0.9)" strokeWidth={1} />
              <line x1={sx} y1={shoulderY - 8} x2={sx} y2={shoulderY + 8} stroke="rgba(6,182,212,0.9)" strokeWidth={1} />
            </g>
          ))}
          <text
            x={cropX + 4}
            y={shoulderY - 4}
            fill="rgba(6,182,212,0.95)"
            fontSize="8"
            fontWeight="bold"
          >
            SHOULDER LEVEL LINE
          </text>
        </g>
      )}
    </svg>
  );
}
