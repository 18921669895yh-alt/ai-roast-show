type ComedyMetricCardProps = {
  label: string;
  value: number;
  caption: string;
};

export default function ComedyMetricCard({ label, value, caption }: ComedyMetricCardProps) {
  return (
    <article className="comedy-metric-card">
      <div className="metric-heading"><h3>{label}</h3><strong>{value}</strong></div>
      <meter aria-label={label} min={0} max={100} value={value}>{value}/100</meter>
      <p>{caption}</p>
    </article>
  );
}
