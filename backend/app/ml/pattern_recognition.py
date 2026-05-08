"""Higher-level pattern recognition orchestration."""
from __future__ import annotations

from typing import List

import pandas as pd

from app.ml.anomaly import (
    Pattern,
    detect_divergence,
    detect_fomo,
    detect_spike,
    detect_whale,
)


def scan_patterns(df: pd.DataFrame) -> List[Pattern]:
    """Run every pattern detector against a single dataframe and return
    a list of detected patterns (may be empty).
    """
    patterns: List[Pattern] = []
    for fn in (detect_fomo, detect_divergence, detect_whale, detect_spike):
        try:
            p = fn(df)
            if p is not None:
                patterns.append(p)
        except Exception:
            # Detectors must never break the main loop.
            continue
    return patterns
