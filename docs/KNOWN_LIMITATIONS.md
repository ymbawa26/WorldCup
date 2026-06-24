# Known Limitations

## Phase 3

- The current application is a tested visual and technical foundation, not a playable game.
- New Tournament and Continue are intentionally disabled.
- Teams, groups, fixtures, tournament rules, official squads, players, a
  database migration, and a seed are present; ratings and simulation state are not.
- The application reads immutable files at build time; normal page requests do
  not yet use a live database connection.
- Preferred foot, secondary positions, and league are absent from the official
  source and remain unpopulated rather than estimated without a licensed source.
- Fixture dates and venues are modeled, but kickoff times are not yet stored.
- Only the 11 June 2026 FIFA ranking is populated. The standings engine supports
  preceding editions but explicitly rejects a tie if available history cannot
  resolve it.
- No authentication or save storage exists.
- The mobile navigation is a simple disclosure menu; richer focus management will be reviewed with the complete navigation system.
- English is the only locale. The locale/message boundary is prepared for `next-intl`, but localized routing is not active.
- The animated pitch remains decorative product framing, not a match simulation.
- No deployment has occurred.

These are phase boundaries rather than hidden placeholders. Each system will be removed from this list only after its owning phase passes automated and manual validation.
