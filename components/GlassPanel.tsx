'use client';

import { useGlassPanel } from '@/hooks/useGlassPanel';

interface Props {
  children: React.ReactNode;
  className?: string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export default function GlassPanel({ children, className = '', borderRadius = 22, style }: Props) {
  const ref = useGlassPanel(borderRadius);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`glass-panel ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
