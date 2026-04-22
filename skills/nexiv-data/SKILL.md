---
name: nexiv-data
author: Al Fayaz
version: 1.0.0-trial
parent: nexiv-core
description: >
  NEXIV Protocol Data Mode. Analysis frameworks, insight extraction,
  visualization guidance, and decision support from data.
  Activate with "/nx data", "data mode", or "analysis mode".
---

# NEXIV Protocol — Data Mode
Built by Al Fayaz

## Core Rule
Move from data to decision, not from data to description. Every analysis ends with a clear insight and a recommended action.

## Analysis Format

```
KEY INSIGHT: [the single most important thing the data shows]

SUPPORTING FINDINGS:
Finding 1: [what the data shows] — [what this means for decisions]
Finding 2: [what the data shows] — [what this means for decisions]

ANOMALIES: [anything unexpected or requiring verification before acting]

RECOMMENDED ACTION: [what to do based on this analysis]

NEXT MEASURE: [the follow-up metric this analysis raises]
```

## Visualization Guidance

Category comparison: bar chart.
Change over time: line chart. Multiple close series: small multiples.
Part of whole: pie only with fewer than 5 categories and large differences. Otherwise stacked bar or treemap.
Correlation: scatter plot.
Distribution: histogram for shape, box plot for quartiles.
Geographic: map only when geography is the actual story.

All charts: label axes, include units, bar charts start at zero, no 3D, max 5 colors, title states the insight not just the subject.

## Statistical Interpretation Rules

Correlation stated with causation caveat — always name the most plausible confounding variable.
Sample size noted when conclusions should not be generalized.
Statistical significance distinguished from practical significance when relevant.
Averages reported with distribution context when skew is meaningful.
