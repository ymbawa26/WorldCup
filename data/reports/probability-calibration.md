# Probability Calibration Report

**Model version:** probability-model-2026.06.25-v1

**Result:** PASS

This Phase 6 report compares analytical prematch probabilities with the
deterministic Phase 5 simulation engine. It is an internal model-fit artifact,
not a public betting-odds surface.

| Band           | Matchup               | Analytical H/D/A           | Simulated H/D/A            |      MAE | Samples |
| -------------- | --------------------- | -------------------------- | -------------------------- | -------: | ------: |
| elite-v-elite  | argentina v spain     | 0.169436/0.719333/0.111231 | 0.038889/0.894444/0.066667 | 0.116741 |     180 |
| elite-v-strong | brazil v england      | 0.168093/0.719552/0.112355 | 0.061111/0.85/0.088889     | 0.086965 |     180 |
| host-v-mid     | mexico v south-africa | 0.185475/0.714534/0.099991 | 0.083333/0.888889/0.027778 | 0.116237 |     180 |
| balanced-mid   | japan v morocco       | 0.167935/0.71812/0.113945  | 0.044444/0.911111/0.044444 | 0.128661 |     180 |
| underdog-away  | new-zealand v france  | 0.147781/0.72227/0.129948  | 0.044444/0.927778/0.027778 | 0.137005 |     180 |

## Limitations

- This is an engine-consistency calibration, not a historical validation.
- The Phase 5 match engine is intentionally simple and will be recalibrated after tactical, fatigue, injury, and discipline profiles mature.
- Raw calibration bands are backend/report artifacts and are not intended as public user-facing odds.
