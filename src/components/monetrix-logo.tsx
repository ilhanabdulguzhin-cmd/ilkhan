"use client";

import React from "react";
import Image from "next/image";

// Monetrix brand logo component
// Brand colors: #3629B7 primary blue, white on dark bg
// Icon: 4-pointed star (sparkle) in a circle — официальный знак Monetrix

// ─── Icon only (4-pointed star in circle) ─────────────────────────────────────
export function MonetrixIcon({
  size = 32,
  white = false,
  className = "",
}: {
  size?: number;
  white?: boolean;
  className?: string;
}) {
  const circleFill = white ? "#ffffff" : "#3629B7";
  const starFill = white ? "#3629B7" : "#ffffff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Monetrix"
    >
      <circle cx="50" cy="50" r="50" fill={circleFill} />
      {/* 4-pointed sparkle star — фирменный знак Monetrix */}
      <path
        d="M50 18 C50 18 44 38 26 50 C44 62 50 82 50 82 C50 82 56 62 74 50 C56 38 50 18 50 18Z"
        fill={starFill}
      />
    </svg>
  );
}

// ─── Full horizontal logo (PNG from brand book) ────────────────────────────────
export function MonetrixLogo({
  height = 28,
  white = false,
  className = "",
}: {
  height?: number;
  white?: boolean;
  className?: string;
}) {
  const width = Math.round(height * 4.7); // ratio ~4.7:1
  return (
    <Image
      src="/monetrix-logo.png"
      alt="Monetrix"
      width={width}
      height={height}
      className={`${white ? "brightness-0 invert" : ""} ${className}`}
      priority
    />
  );
}

// ─── Logo with icon + text (horizontal compact) ────────────────────────────────
export function MonetrixBrand({
  size = "md",
  white = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  white?: boolean;
  className?: string;
}) {
  const heights = { sm: 22, md: 28, lg: 36 };
  return (
    <MonetrixLogo height={heights[size]} white={white} className={className} />
  );
}

export default MonetrixLogo;
