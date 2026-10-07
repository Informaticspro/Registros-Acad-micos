import type { NextEventData } from '../../types/fadeco';

interface Props { event: NextEventData; onView?: () => void; onEnroll?: () => void; }

export function NextEventHero({ event, onView, onEnroll }: Props) {
  return (
    <section className="fd-hero">
      <div className="fd-hero__orb fd-hero__orb--a" />
      <div className="fd-hero__orb fd-hero__orb--b" />
      <div className="fd-hero__body">
        <span className="fd-hero__eyebrow">Próximo evento</span>
        <h2 className="fd-hero__title">{event.title}</h2>
        <div className="fd-hero__meta">{event.meta}</div>
        <div className="fd-hero__actions">
          <button type="button" className="fd-hero__btn" onClick={onView}>Ver evento</button>
          <button type="button" className="fd-hero__btn fd-hero__btn--ghost" onClick={onEnroll}>Inscribir participante</button>
        </div>
      </div>
      <div className="fd-hero__count">
        <div className="fd-hero__count-num">{event.daysLeft}</div>
        <div className="fd-hero__count-label">días para el evento</div>
      </div>
    </section>
  );
}
