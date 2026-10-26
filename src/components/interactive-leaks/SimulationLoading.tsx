import './simulation-loading.css';

export default function SimulationLoading() {
  return (
    <div className="il-calculating" role="status" aria-live="polite">
      <span className="il-calculating__orbit" aria-hidden="true"></span>
      <div><strong>Building your simulation</strong><p>Calculating performance, battery life and thermal behaviour…</p></div>
      <span className="il-calculating__track" aria-hidden="true" />
    </div>
  );
}
