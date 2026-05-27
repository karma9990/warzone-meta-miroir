'use client';

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="pt-optimizer-copy"
      onClick={() => navigator.clipboard.writeText(text)}
      title="Copy to clipboard"
    >
      COPY
    </button>
  );
}
