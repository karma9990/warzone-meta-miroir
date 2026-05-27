'use client';

interface StatBarProps {
  label: string;
  value: number;
}

export default function StatBar({ label, value }: StatBarProps) {
  return (
    <div className="stat-bar">
      <span>{label}</span>
      <div aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}
