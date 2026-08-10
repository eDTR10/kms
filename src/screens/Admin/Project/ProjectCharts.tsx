// @ts-nocheck
// The Charts engine lives in FreeWifi's folder (its original home) and is shared
// across every project via the `slug` prop — see FreeWifiCharts.tsx for the actual
// implementation. This file just keeps the same import path the 7 other projects'
// XCharts.tsx wrappers already use.
import FreeWifiCharts from '../FreeWifi/FreeWifiCharts';

export default function ProjectCharts({ slug }) {
  return <FreeWifiCharts slug={slug} />;
}
