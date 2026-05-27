import Link from 'next/link';

type CompetitiveNavProps = {
  active?: 'top250' | 'calendar' | 'wsow' | 'resurgence' | 'ewc' | 'pullze';
};

type IconName = 'trophy' | 'calendar' | 'wsow' | 'wrs' | 'ewc' | 'pulse';

const items: Array<{
  key: NonNullable<CompetitiveNavProps['active']>;
  label: string;
  href: string;
  icon: IconName;
}> = [
  { key: 'top250', label: 'TOP 250', href: '/esport/top-250', icon: 'trophy' },
  { key: 'calendar', label: 'Calendar', href: '/esport/calendar', icon: 'calendar' },
  { key: 'wsow', label: 'World Series of Warzone', href: '/esport/wsow', icon: 'wsow' },
  { key: 'resurgence', label: 'Resurgence Series', href: '/esport/resurgence-series', icon: 'wrs' },
  { key: 'ewc', label: 'Esports World Cup', href: '/esport/ewc', icon: 'ewc' },
  { key: 'pullze', label: 'Pullze Check', href: '/esport/pullze-check', icon: 'pulse' },
];

function CompetitiveIcon({ name }: { name: IconName }) {
  if (name === 'trophy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8v3.5c0 3.2-1.5 5.4-4 6.3-2.5-.9-4-3.1-4-6.3V4Z" />
        <path d="M8 6H4v2.2c0 2.1 1.5 3.6 3.7 3.8M16 6h4v2.2c0 2.1-1.5 3.6-3.7 3.8M12 14v3M8.5 20h7M10 17h4" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14v15H5V5Z" />
        <path d="M8 3v4M16 3v4M5 9h14M8 13h3M13 13h3M8 16h3" />
      </svg>
    );
  }

  if (name === 'pulse') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10l-2 18H5L7 3Z" />
        <path d="M9 8h5M8.5 12h4.5" />
      </svg>
    );
  }

  return (
    <span className="competitive-mark" aria-hidden="true">
      {name === 'wsow' ? 'WS' : name === 'wrs' ? 'WRS' : 'EWC'}
    </span>
  );
}

export default function CompetitiveNav({ active }: CompetitiveNavProps) {
  return (
    <aside className="competitive-nav" aria-label="Competitive navigation">
      <p className="competitive-kicker">Competitive</p>
      <nav>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={active === item.key ? 'is-active' : undefined}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <span className="competitive-icon">
              <CompetitiveIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
