// @ts-nocheck
import ProjectDatasets from '../Project/ProjectDatasets';

// Renders under Free Wi-Fi's "Datasets" tab — same blank, admin-defined-table system
// the other 7 projects use for theirs. The old fixed-schema site data editor
// (FreeWifiDatasets — Live/Main/Target/Masterlist) is no longer linked from the admin
// nav, but its models/API and the public map/summary stats it powers are untouched.
export default function FreeWifiCustomTables() {
  return <ProjectDatasets slug="free-wifi" />;
}
