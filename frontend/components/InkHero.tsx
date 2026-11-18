import { Fragment, type CSSProperties } from "react";

type InkLane = {
  label: string;
  detail: string;
};

type InkHeroProps = {
  /** Example input text. It develops from a blurred ghost to printed ink. */
  phrase: string;
  /** The two model tracks, as facts rather than results. */
  lanes: InkLane[];
  /** Honesty line: what this plate is and is not. */
  note: string;
};

type InkWordStyle = CSSProperties & { "--word-index": string };

function InkWords({ words }: { words: string[] }) {
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="ink-word">
            <span style={{ "--word-index": String(index) } as InkWordStyle}>{word}</span>
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/**
 * A presentational figure with no JavaScript. The reveal is CSS only, so a
 * delayed or blocked bundle still paints the complete plate: the animation
 * resolves to the same markup the static fallback renders.
 */
export function InkHero({ phrase, lanes, note }: InkHeroProps) {
  const words = phrase.split(" ");

  return (
    <figure className="ink-hero">
      <div className="ink-hero__grain" aria-hidden="true" />
      <div className="ink-hero__wash" aria-hidden="true" />

      <div className="ink-hero__plate">
        <div className="ink-hero__head">
          <span>Example input</span>
          <span>Fig. 01</span>
        </div>

        <p className="ink-hero__phrase">
          <span className="ink-hero__phrase-ghost" aria-hidden="true">
            <InkWords words={words} />
          </span>
          <span className="ink-hero__phrase-ink">
            <InkWords words={words} />
          </span>
        </p>

        <ul className="ink-hero__lanes">
          {lanes.map((lane) => (
            <li key={lane.label}>
              <span className="ink-hero__lane-label">{lane.label}</span>
              <span className="ink-hero__lane-detail">{lane.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="ink-hero__caption">
        <span>{note}</span>
        <span>NLP / TEXT</span>
      </figcaption>
    </figure>
  );
}
