export default function TxTimeline({ steps }) {
  return (
    <ol className="tx-timeline">
      {steps.map((step, i) => (
        <li key={i} className={step.done ? "done" : "pending"}>
          <div className="tx-timeline-dot" />
          <div>
            <strong>{step.label}</strong>
            {step.txHash && (
              <p className="tx-hash">
                tx: <code>{step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}</code>
              </p>
            )}
            {step.timestamp && <p className="tx-time">{new Date(step.timestamp).toLocaleString()}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
