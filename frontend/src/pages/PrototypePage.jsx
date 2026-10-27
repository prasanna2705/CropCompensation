import { useMemo, useState } from "react";

const tierNames = ["No loss · 0%", "Moderate · 25%", "Severe · 50%", "Total · 100%"];
const demoLandHashes = ["ANP-KHA-042", "DEMO-LAND-001"];
const tierAmounts = [0, 25000, 50000, 100000];

export default function PrototypePage() {
  const [form, setForm] = useState({ farmer: "Lakshmi Prasanna", district: "Anantapur", crop: "Groundnut", landHash: "ANP-KHA-118", insured: 100000 });
  const [reports, setReports] = useState([2, 2, 1]);
  const [evaluated, setEvaluated] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const [registered, setRegistered] = useState(true);
  const duplicate = demoLandHashes.includes(form.landHash.trim().toUpperCase());
  const counts = useMemo(() => reports.reduce((all, value) => ({ ...all, [value]: (all[value] || 0) + 1 }), {}), [reports]);
  const winner = Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]);
  const tie = Object.values(counts).filter((count) => count === Math.max(...Object.values(counts))).length > 1;
  const payout = Math.round(Number(form.insured || 0) * [0, 0.25, 0.5, 1][winner]);
  const review = flagged || disputed || tie;

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setEvaluated(false); }

  return <div className="prototype-page">
    <header className="prototype-hero">
      <div className="prototype-brand"><span className="brand-mark">A</span> AGRISHIELD <span className="prototype-tag">PROTOTYPE</span></div>
      <p className="eyebrow">BLOCKCHAIN CROP LOSS COMPENSATION</p>
      <h1>Clear rules.<br /><em>Fairer recovery.</em></h1>
      <p className="hero-copy">A simple demonstration of how independent weather, satellite and soil signals can support transparent crop compensation.</p>
      <a href="#demo" className="hero-link">Explore the prototype <span aria-hidden="true">↓</span></a>
      <div className="hero-art" aria-hidden="true"><div className="sun"/><div className="field field-one"/><div className="field field-two"/><div className="field field-three"/><span className="art-label">ANANTAPUR · KHARIF</span></div>
      <div className="hero-foot"><span>01 / 03 ORACLE SOURCES</span><span>DEMO DATA · NO REAL PAYMENTS</span></div>
    </header>

    <main id="demo" className="prototype-main">
      <section className="intro-row"><div><p className="eyebrow">INTERACTIVE DEMONSTRATION</p><h2>From field to decision</h2></div><p>This front-end prototype uses sample inputs to show the proposed workflow. No land records, external datasets or on-chain payouts are used here.</p></section>
      <div className="prototype-grid">
        <section className="demo-card field-card">
          <div className="card-heading"><span className="step-number">01</span><div><h3>Register a field</h3><p>Personal details stay off-chain in the proposed design.</p></div></div>
          <div className="prototype-form">
            <label>Farmer name<input value={form.farmer} onChange={(e) => update("farmer", e.target.value)} /></label>
            <div className="form-pair"><label>District<input value={form.district} onChange={(e) => update("district", e.target.value)} /></label><label>Crop<input value={form.crop} onChange={(e) => update("crop", e.target.value)} /></label></div>
            <label>Land reference hash<input value={form.landHash} onChange={(e) => update("landHash", e.target.value)} /><small>Demo identifier only. Do not enter personal or real land information.</small></label>
            <label>Sum insured (₹)<input type="number" min="0" value={form.insured} onChange={(e) => update("insured", e.target.value)} /></label>
            {duplicate && <p className="inline-alert">This demo reference already has an active policy. Duplicate coverage is blocked.</p>}
            <button className="primary-button" disabled={duplicate} onClick={() => { setRegistered(true); setEvaluated(false); }}> {registered ? "Field registered · active policy" : "Register field and issue policy"}</button>
          </div>
          <div className="privacy-note"><span>◈</span><p><strong>Privacy by design</strong><br />Only a land reference hash is intended for the public ledger. Personal records remain off-chain.</p></div>
        </section>

        <section className="demo-card oracle-card">
          <div className="card-heading"><span className="step-number">02</span><div><h3>Review oracle signals</h3><p>Each source submits a loss tier from 0 to 3.</p></div></div>
          <div className="oracle-list">
            {["Weather · seasonal rainfall", "Satellite · crop health (NDVI)", "Soil · root-zone moisture"].map((source, index) => <label className="oracle-row" key={source}><span className="oracle-icon">{["☼", "◌", "◒"][index]}</span><span className="oracle-name">{source}<small>{["Public weather data", "Sentinel-2 imagery", "SMAP or labelled demo data"][index]}</small></span><select aria-label={`${source} tier`} value={reports[index]} onChange={(e) => { const next = [...reports]; next[index] = Number(e.target.value); setReports(next); setEvaluated(false); }}>{tierNames.map((tier, value) => <option value={value} key={tier}>{tier}</option>)}</select></label>)}
          </div>
          <label className="review-toggle"><input type="checkbox" checked={flagged} onChange={(e) => { setFlagged(e.target.checked); setEvaluated(false); }} /><span><strong>Flag for field officer review</strong><small>Use when a boundary or anomaly check needs attention.</small></span></label>
          <button className="primary-button" onClick={() => setEvaluated(true)} disabled={!registered || duplicate}>Evaluate sample reports</button>
          <p className="demo-caption">Agreement rule shown: majority tier among three sample reports.</p>
        </section>
      </div>

      <section className={`decision-panel ${evaluated ? (review ? "decision-review" : "decision-ready") : "decision-pending"}`} aria-live="polite">
        <div className="decision-copy"><p className="eyebrow">03 / COMPENSATION DECISION</p><h2>{!evaluated ? "Ready for evaluation" : review ? "Review required" : payout ? "Compensation calculated" : "No payout triggered"}</h2><p>{!evaluated ? "Submit the sample oracle reports to see the agreement rule." : review ? "This case is held for human review. No automatic payment is made." : "The majority oracle tier sets the indicative compensation amount."}</p></div>
        <div className="decision-result"><span>{evaluated && !review ? tierNames[winner] : "—"}</span><strong>{evaluated && !review ? `₹${payout.toLocaleString("en-IN")}` : "₹—"}</strong><small>{evaluated && !review ? "Indicative sample amount" : "Awaiting an eligible decision"}</small></div>
        <div className="decision-actions"><button className="secondary-button" disabled={!evaluated || review || disputed} onClick={() => setDisputed(true)}>{disputed ? "Dispute submitted" : "Raise a dispute"}</button>{disputed && <span className="review-status">Sent to officer review</span>}</div>
      </section>

      <section className="prototype-limit"><span>ⓘ</span><p><strong>Prototype boundary</strong> Oracle values and calculations on this page are illustrative. A real deployment would validate calibrated thresholds, source provenance, contract security, insurance rules and field outcomes before handling real policies or funds.</p></section>
    </main>
    <footer className="prototype-footer"><span>AGRISHIELD · CROP LOSS COMPENSATION</span><span>TRANSPARENT BY DESIGN</span></footer>
  </div>;
}
