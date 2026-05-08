"use client";

import dynamic from "next/dynamic";

// We dynamically import react-plotly.js together with plotly.js-dist-min on
// the client only.  createPlotlyComponent lets us use the slimmer dist-min
// bundle instead of the full plotly.js package.
const Plot = dynamic(
  async () => {
    const Plotly = (await import("plotly.js-dist-min")).default as any;
    const createPlotlyComponent = (await import("react-plotly.js/factory")).default;
    return createPlotlyComponent(Plotly);
  },
  { ssr: false }
) as any;

export default Plot;
