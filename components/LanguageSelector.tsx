import Link from 'next/link';
import { LANGUAGE_OPTIONS, SUPPORTED_LOCALES, withLocalePath } from '@/lib/i18n';

export default function LanguageSelector() {
  const enabledLanguages = LANGUAGE_OPTIONS.filter((language) =>
    SUPPORTED_LOCALES.includes(language.locale),
  );

  return (
    <div className="language-options" aria-label="Language selection">
      {enabledLanguages.map((language) => (
        <Link
          key={language.locale}
          className="language-card"
          href={withLocalePath('/', language.locale)}
          prefetch={false}
        >
          <span>{language.locale.toUpperCase()}</span>
          <strong>{language.nativeLabel}</strong>
          <small>{language.description}</small>
          <b>Continue</b>
        </Link>
      ))}
    </div>
  );
}
