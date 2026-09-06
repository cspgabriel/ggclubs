import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TournamentChoice } from './tournament-choice';

export function TournamentSections({
  sections,
  current,
}: {
  sections: { key: string; label: string; content: ReactNode }[];
  current: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [choice, setChoice] = useState<string | null>(null);
  const selected = sections.some((section) => section.key === choice) ? choice : current;
  return (
    <div data-tournament-sections>
      <div
        role="tablist"
        aria-label={t('tournament.sectionsLabel')}
        className="mb-5 flex gap-2 sm:gap-3"
      >
        {sections.map((section, index) => (
          <TournamentChoice
            key={section.key}
            selected={selected === section.key}
            className="flex-auto sm:min-w-40 sm:flex-none"
            role="tab"
            id={`${id}-tab-${section.key}`}
            aria-controls={`${id}-panel-${section.key}`}
            aria-selected={selected === section.key}
            tabIndex={selected === section.key ? 0 : -1}
            onClick={() => setChoice(section.key)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % sections.length
                  : event.key === 'ArrowLeft'
                    ? (index + sections.length - 1) % sections.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? sections.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              const target = sections[next]!;
              setChoice(target.key);
              document.getElementById(`${id}-tab-${target.key}`)?.focus();
            }}
          >
            {section.label}
          </TournamentChoice>
        ))}
      </div>
      {sections.map((section) => (
        <div
          key={section.key}
          id={`${id}-panel-${section.key}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${section.key}`}
          hidden={selected !== section.key}
          tabIndex={0}
          className="focus-visible:outline-2 focus-visible:outline-primary"
        >
          {section.content}
        </div>
      ))}
    </div>
  );
}
