import type { CSSProperties } from 'react';
import type { TimeOfDayPhase } from '@mirusync/core';

const BOX: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

function delay(s: number): CSSProperties {
  return { ...BOX, animationDelay: `${s}s` };
}

/** 4-point sparkle star (flat) */
function Sparkle({ x, y, s = 4, d = 0, fill }: { x: number; y: number; s?: number; d?: number; fill: string }) {
  return (
    <path
      className="animate-star-twinkle"
      style={delay(d)}
      d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`}
      fill={fill}
    />
  );
}

/** Flat cloud built from simple shapes */
function Cloud({ x, y, scale = 1, fill, opacity = 1, d = 0 }: { x: number; y: number; scale?: number; fill: string; opacity?: number; d?: number }) {
  return (
    <g className="animate-cloud-drift" style={delay(d)} opacity={opacity}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
        <rect x="0" y="8" width="34" height="9" rx="4.5" />
        <circle cx="12" cy="8" r="6" />
        <circle cx="22" cy="6" r="7.5" />
      </g>
    </g>
  );
}

export function SkyBackdrop({ phase }: { phase: TimeOfDayPhase }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-64 max-w-[70%]">
      <svg viewBox="0 0 220 110" preserveAspectRatio="xMaxYMid slice" className="h-full w-full">
        {phase === 'day' && (
          <>
            <g className="animate-sun-spin" style={BOX}>
              {Array.from({ length: 8 }).map((_, i) => (
                <line
                  key={i}
                  x1="176"
                  y1="26"
                  x2="176"
                  y2="16"
                  stroke="#f59e0b"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.7"
                  transform={`rotate(${i * 45} 176 38)`}
                />
              ))}
            </g>
            <circle cx="176" cy="38" r="15" fill="#fbbf24" />
            <circle cx="176" cy="38" r="21" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.45" />
            <Cloud x={112} y={22} fill="#ffffff" opacity={0.9} />
            <Cloud x={150} y={78} scale={0.8} fill="#ffffff" opacity={0.7} d={-4} />
          </>
        )}

        {phase === 'dawn' && (
          <>
            <circle cx="170" cy="96" r="26" fill="#fda4af" />
            <circle cx="170" cy="96" r="34" fill="none" stroke="#fde68a" strokeWidth="1.2" opacity="0.6" />
            <g stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.55">
              <line className="animate-cloud-drift" style={BOX} x1="96" y1="34" x2="140" y2="34" />
              <line className="animate-cloud-drift" style={delay(-3)} x1="116" y1="46" x2="152" y2="46" />
              <line className="animate-cloud-drift" style={delay(-6)} x1="88" y1="58" x2="118" y2="58" />
            </g>
            <Sparkle x={196} y={26} s={3.5} fill="#fef3c7" />
            <Sparkle x={128} y={14} s={2.5} d={-1.4} fill="#fef3c7" />
          </>
        )}

        {phase === 'dusk' && (
          <>
            <defs>
              <clipPath id="dusk-sun">
                <circle cx="170" cy="82" r="28" />
              </clipPath>
            </defs>
            <g className="animate-sun-pulse" style={BOX}>
              <circle cx="170" cy="82" r="28" fill="#fb923c" />
              <g clipPath="url(#dusk-sun)" fill="#7c2d56" opacity="0.55">
                <rect x="140" y="84" width="60" height="2.5" />
                <rect x="140" y="91" width="60" height="3.5" />
                <rect x="140" y="99" width="60" height="5" />
              </g>
            </g>
            <path d="M0 110 L0 96 Q55 78 110 94 T220 90 L220 110 Z" fill="#1e1b4b" opacity="0.4" />
            <g stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" opacity="0.5">
              <line className="animate-cloud-drift" style={BOX} x1="96" y1="30" x2="146" y2="30" />
              <line className="animate-cloud-drift" style={delay(-4)} x1="122" y1="42" x2="158" y2="42" />
            </g>
          </>
        )}

        {phase === 'night' && (
          <>
            <g className="animate-moon-float" style={BOX}>
              <path
                d="M184 22 A18 18 0 1 0 198 52 A14 14 0 1 1 184 22 Z"
                fill="#fef9c3"
              />
            </g>
            <Sparkle x={140} y={22} s={4} fill="#bae6fd" />
            <Sparkle x={112} y={46} s={3} d={-1} fill="#ffffff" />
            <Sparkle x={160} y={74} s={3.5} d={-2} fill="#c7d2fe" />
            <Sparkle x={96} y={18} s={2.5} d={-0.5} fill="#e0f2fe" />
            <line
              className="animate-shooting-star"
              style={BOX}
              x1="150"
              y1="12"
              x2="172"
              y2="4"
              stroke="#e0f2fe"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        )}

        {phase === 'midnight' && (
          <>
            <path
              className="animate-aurora"
              d="M70 30 Q110 14 150 30 T220 28"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              className="animate-aurora"
              style={{ animationDelay: '-3s' }}
              d="M80 44 Q120 28 160 44 T220 42"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.4"
            />
            <g className="animate-moon-float" style={BOX}>
              <circle cx="188" cy="62" r="15" fill="#e2e8f0" />
              <circle cx="183" cy="58" r="3" fill="#cbd5e1" />
              <circle cx="193" cy="67" r="2" fill="#cbd5e1" />
              <circle cx="188" cy="62" r="21" fill="none" stroke="#a5b4fc" strokeWidth="1" opacity="0.4" />
            </g>
            <Sparkle x={130} y={72} s={3.5} fill="#a5b4fc" />
            <Sparkle x={104} y={92} s={2.5} d={-1.2} fill="#c7d2fe" />
            <Sparkle x={150} y={96} s={3} d={-2.2} fill="#67e8f9" />
          </>
        )}
      </svg>
    </div>
  );
}
