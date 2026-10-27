import { useState } from "react";
import OracleSimulatorPanel from "../components/OracleSimulatorPanel";

export default function OracleSimulatorPage() {
  const [regionId, setRegionId] = useState(1);

  return (
    <div className="page">
      <h2>Oracle Reading Simulator</h2>
      <p className="hint">
        For the live demo: connect two different wallet accounts that have both been
        added as authorized oracles (see Admin → Manage Oracles), and submit a
        below-threshold reading from each. The second confirming transaction should
        trigger the payout automatically — watch the farmer's Policy Detail page
        update in real time.
      </p>
      <label>
        Region ID
        <input type="number" value={regionId} onChange={(e) => setRegionId(Number(e.target.value))} />
      </label>
      <OracleSimulatorPanel regionId={regionId} />
    </div>
  );
}
