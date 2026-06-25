# Known Limitations

## Phase 7

- The current application is a tested visual and technical foundation, not a playable game.
- New Tournament and Continue are intentionally disabled.
- Teams, groups, fixtures, tournament rules, official squads, players, a
  database migration, a seed, estimated ratings, default lineups, and headless
  match simulation are present.
- Core game flow is playable through an accelerated `/play` route, but it is not
  yet a full manager career or match-center UI.
- Probability models and calibration reports exist, but raw probability
  diagnostics are intentionally not exposed as a user-facing odds page.
- The application reads immutable files at build time; normal page requests do
  not yet use a live database connection.
- Preferred foot, secondary positions, and league are absent from the official
  source and remain unpopulated as factual fields. Rating outputs account for
  that missing detail through lower confidence and higher uncertainty.
- Ratings are estimates derived from official squad facts and team ranking
  context. They are not scouting reports and are not copied from proprietary
  games.
- Fixture dates and venues are modeled, but kickoff times are not yet stored.
- Only the 11 June 2026 FIFA ranking is populated. The standings engine supports
  preceding editions but explicitly rejects a tie if available history cannot
  resolve it.
- No authentication or save storage exists.
- The mobile navigation is a simple disclosure menu; richer focus management will be reviewed with the complete navigation system.
- English is the only locale. The locale/message boundary is prepared for `next-intl`, but localized routing is not active.
- The animated pitch remains decorative product framing; the headless event log
  exists but is not yet wired into a playable match UI.
- User tactics editing, legal lineup editing, fixture-by-fixture calendar flow,
  and simultaneous-match presentation are still simplified.
- Historical calibration against a licensed external match-result corpus is not
  bundled yet; Phase 6 calibration is internal analytical-vs-engine consistency.
- No deployment has occurred.

These are phase boundaries rather than hidden placeholders. Each system will be removed from this list only after its owning phase passes automated and manual validation.
