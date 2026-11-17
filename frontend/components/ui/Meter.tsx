type MeterProps = {
  label: string;
  value: number;
  max?: number;
  /** Exact readout. Defaults to a rounded percentage. */
  valueLabel?: string;
  tone?: "primary" | "model";
};

/**
 * A labelled probability bar. Renders a real <progress> element so the number and the
 * bar cannot disagree, and assistive technology gets the same reading.
 */
export function Meter({ label, value, max = 1, valueLabel, tone = "primary" }: MeterProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const readout = valueLabel ?? `${(ratio * 100).toFixed(0)}%`;

  return (
    <div className="meter">
      <div className="meter__head">
        <span className="meter__label">{label}</span>
        <span className="meter__value">{readout}</span>
      </div>
      <progress className={`meter__track meter__track--${tone}`} max={max} value={value}>
        {readout}
      </progress>
    </div>
  );
}
