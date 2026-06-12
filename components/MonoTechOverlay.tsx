import type { CSSProperties } from "react";

/**
 * Décor "monotechnical" global, volontairement très discret (faible opacité).
 * Rendu fixe sur toutes les pages via le layout. Purement décoratif :
 * aria-hidden + pointer-events: none pour ne jamais gêner l'interaction.
 * Styles inline pour garantir le positionnement dans les coins.
 */
const label: CSSProperties = {
  position: "absolute",
  whiteSpace: "nowrap",
  fontFamily: "var(--tm-mono)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

export default function MonoTechOverlay() {
  return (
    <div
      className="mono-tech-overlay"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        color: "var(--tm-ink, #10100e)",
        opacity: 0.1,
      }}
    >
      <span style={{ ...label, top: 14, left: 16 }}>WZPRO / SYS-26.06 · BUILD STABLE</span>
      <span style={{ ...label, top: 14, right: 16 }}>LAT 45.4241 N / LON 31.6128 E</span>
      <span style={{ ...label, bottom: 14, left: 16 }}>SECTOR AO-17 · GRID 08T KT 421 773</span>
      <span style={{ ...label, bottom: 14, right: 16 }}>TELEMETRY ● SIGNAL 92% · LIVE SORT</span>
      <span
        style={{
          ...label,
          top: "50%",
          left: 14,
          writingMode: "vertical-rl",
          transform: "translateY(-50%) rotate(180deg)",
        }}
      >
        TACTICAL MONO / WZ_META
      </span>
      <span
        style={{
          ...label,
          top: "50%",
          right: 14,
          writingMode: "vertical-rl",
          transform: "translateY(-50%)",
        }}
      >
        THERMAL PASSIVE / REV 26.06
      </span>
    </div>
  );
}
