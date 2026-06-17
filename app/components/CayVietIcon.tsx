"use client";

/**
 * CÂY VIỆT – Custom brand icon.
 *
 * A stylized tree representing Vietnam, combining:
 * - A sturdy trunk (resilience)
 * - Five leaves (five continents / growth)
 * - Vietnamese star motif in the center
 * - Modern, geometric aesthetic
 */

type CayVietIconProps = {
  size?: number;
  className?: string;
};

export default function CayVietIcon({ size = 24, className }: CayVietIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cây Việt Logo"
    >
      {/* Trunk – sturdy foundation */}
      <rect
        x="27"
        y="32"
        width="10"
        height="24"
        rx="5"
        fill="url(#trunkGrad)"
      />

      {/* Trunk roots */}
      <path
        d="M27 54 C24 54, 20 56, 18 58"
        stroke="url(#trunkGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M37 54 C40 54, 44 56, 46 58"
        stroke="url(#trunkGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M27 52 C22 53, 16 54, 14 56"
        stroke="url(#trunkGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M37 52 C42 53, 48 54, 50 56"
        stroke="url(#trunkGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaf 1 – top center */}
      <path
        d="M32 12 C28 18, 26 26, 32 32 C38 26, 36 18, 32 12Z"
        fill="url(#leafGrad1)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.8"
      />

      {/* Leaf 2 – top right */}
      <path
        d="M42 14 C46 20, 44 28, 38 30 C36 24, 38 18, 42 14Z"
        fill="url(#leafGrad2)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.8"
      />

      {/* Leaf 3 – top left */}
      <path
        d="M22 14 C18 20, 20 28, 26 30 C28 24, 26 18, 22 14Z"
        fill="url(#leafGrad3)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.8"
      />

      {/* Leaf 4 – lower right */}
      <path
        d="M44 28 C50 32, 48 38, 42 38 C40 34, 42 30, 44 28Z"
        fill="url(#leafGrad4)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.8"
      />

      {/* Leaf 5 – lower left */}
      <path
        d="M20 28 C14 32, 16 38, 22 38 C24 34, 22 30, 20 28Z"
        fill="url(#leafGrad5)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.8"
      />

      {/* Star in center – Vietnamese motif */}
      <g transform="translate(32, 24)">
        <polygon
          points="0,-8 2.4,-2.8 8,-2.8 3.6,1.2 5.2,7 0,3.6 -5.2,7 -3.6,1.2 -8,-2.8 -2.4,-2.8"
          fill="#FFD700"
          opacity="0.9"
        />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id="trunkGrad" x1="27" y1="32" x2="37" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a5632" />
          <stop offset="1" stopColor="#0d3319" />
        </linearGradient>

        <linearGradient id="leafGrad1" x1="32" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>

        <linearGradient id="leafGrad2" x1="38" y1="14" x2="42" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ade80" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>

        <linearGradient id="leafGrad3" x1="26" y1="14" x2="22" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>

        <linearGradient id="leafGrad4" x1="42" y1="28" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86efac" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>

        <linearGradient id="leafGrad5" x1="22" y1="28" x2="20" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
    </svg>
  );
}