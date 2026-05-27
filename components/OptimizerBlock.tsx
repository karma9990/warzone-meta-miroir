'use client';

import { useState } from 'react';
import { absoluteUrl } from '@/lib/siteConfig';

const SCRIPT_URL = absoluteUrl('/api/optimizer');

const COMMANDS = [
  {
    label: 'INTERFACE',
    tone: 'normal',
    description: 'Opens the full built-in graphical interface with options, presets, diagnostics and logs.',
    command: `irm ${SCRIPT_URL} -OutFile "$env:TEMP\\wzpro-optimizer.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\\wzpro-optimizer.ps1" -Mode Gui`,
  },
  {
    label: 'RESTORE',
    tone: 'danger',
    description: 'Restores Windows timers, CPU parking, services and network tweaks to a stable state.',
    command: `irm ${SCRIPT_URL} -OutFile "$env:TEMP\\wzpro-optimizer.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\\wzpro-optimizer.ps1" -Mode Restore`,
  },
  {
    label: 'SAFE',
    tone: 'safe',
    description: 'Applies only conservative optimizations without touching timers or network interrupts.',
    command: `irm ${SCRIPT_URL} -OutFile "$env:TEMP\\wzpro-optimizer.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\\wzpro-optimizer.ps1" -Mode Safe`,
  },
  {
    label: 'TOURNAMENT',
    tone: 'normal',
    description: 'Measured gaming profile: power plan, HAGS, Game Mode, DVR off, conservative network tweaks.',
    command: `irm ${SCRIPT_URL} -OutFile "$env:TEMP\\wzpro-optimizer.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\\wzpro-optimizer.ps1" -Mode Tournament`,
  },
  {
    label: 'DIAGNOSTICS',
    tone: 'normal',
    description: 'Shows optimization status without applying any changes.',
    command: `irm ${SCRIPT_URL} -OutFile "$env:TEMP\\wzpro-optimizer.ps1"; powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\\wzpro-optimizer.ps1" -Mode Diagnostics`,
  },
];

export default function OptimizerBlock() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, command: string) {
    await navigator.clipboard.writeText(command);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="optimizer-block">
      <div className="optimizer-heading">
        <span>CMD TOOL</span>
        <h2>WZ PRO - WINDOWS OPTIMIZER</h2>
      </div>

      <p className="optimizer-lead">
        Apply optimizations progressively: select a small set of tools, run them, restart Windows, then test
        FPS, CPU usage and latency before continuing. Do not check everything at once on a real PC.
      </p>

      <div className="optimizer-safety">
        <strong>Safety workflow</strong>
        <span>1. Create a restore point or VM snapshot.</span>
        <span>2. Run RESTORE if an older optimizer version changed Windows.</span>
        <span>3. Apply 3 to 5 options, reboot, then measure performance before applying more.</span>
      </div>

      <div className="optimizer-grid">
        {COMMANDS.map((item) => (
          <article key={item.label} className={`optimizer-card optimizer-card--${item.tone}`}>
            <div className="optimizer-card-top">
              <strong>{item.label}</strong>
              <button type="button" onClick={() => copy(item.label, item.command)}>
                {copied === item.label ? 'COPIED' : 'COPY'}
              </button>
            </div>
            <p>{item.description}</p>
            <code>{item.command}</code>
          </article>
        ))}
      </div>

      <p className="optimizer-note">
        Run PowerShell as Administrator. Restart Windows before judging FPS, CPU usage or latency.
      </p>

      <style jsx>{`
        .optimizer-block {
          margin-top: 3rem;
          border: 1px solid rgba(0, 0, 255, 0.2);
          border-left: 3px solid blue;
          background: rgba(0, 0, 255, 0.03);
          padding: 1.5rem;
        }

        .optimizer-heading {
          display: flex;
          align-items: baseline;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
          font-family: monospace;
        }

        .optimizer-heading span {
          color: blue;
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          opacity: 0.7;
        }

        .optimizer-heading h2 {
          margin: 0;
          font-size: 0.9rem;
          letter-spacing: 0.12em;
        }

        .optimizer-lead,
        .optimizer-note,
        .optimizer-card p {
          font-family: monospace;
          line-height: 1.6;
          opacity: 0.66;
        }

        .optimizer-lead {
          margin: 0 0 1.25rem;
          font-size: 0.75rem;
        }

        .optimizer-grid {
          display: grid;
          gap: 0.85rem;
        }

        .optimizer-safety {
          display: grid;
          gap: 0.35rem;
          margin: 0 0 1rem;
          border: 1px solid rgba(210, 40, 40, 0.28);
          background: rgba(210, 40, 40, 0.035);
          padding: 0.9rem 1rem;
          font-family: monospace;
        }

        .optimizer-safety strong {
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .optimizer-safety span {
          font-size: 0.66rem;
          line-height: 1.55;
          opacity: 0.68;
        }

        .optimizer-card {
          border: 1px solid rgba(0, 0, 0, 0.14);
          background: rgba(240, 240, 235, 0.74);
          padding: 1rem;
        }

        .optimizer-card--danger {
          border-color: rgba(210, 40, 40, 0.34);
        }

        .optimizer-card--safe {
          border-color: rgba(20, 130, 70, 0.28);
        }

        .optimizer-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .optimizer-card strong {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 0.16em;
        }

        .optimizer-card button {
          border: 0;
          background: blue;
          color: white;
          cursor: pointer;
          font-family: monospace;
          font-size: 0.58rem;
          letter-spacing: 0.16em;
          padding: 0.55rem 0.8rem;
        }

        .optimizer-card p {
          margin: 0.7rem 0;
          font-size: 0.68rem;
        }

        .optimizer-card code {
          display: block;
          background: rgba(10, 10, 20, 0.92);
          color: #a0d4ff;
          font-family: monospace;
          font-size: 0.66rem;
          line-height: 1.55;
          padding: 0.8rem;
          user-select: all;
          white-space: normal;
          word-break: break-word;
        }

        .optimizer-note {
          margin: 0.9rem 0 0;
          font-size: 0.64rem;
          opacity: 0.5;
        }
      `}</style>
    </section>
  );
}
