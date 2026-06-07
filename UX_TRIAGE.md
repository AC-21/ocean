# Harborline UX Triage

Date: 2026-06-05

## Top Five Friction Points

1. Route decisions are scattered across the header, map, Intel tab, Market tab,
   insurance row, and cargo manifest.
   - Fix: add a route command strip on the map surface that combines transit
     time, risk, water state, wear, best cargo, current hold outcome, insurance,
     destination authority, and action buttons. Status: first pass implemented.
2. The market asks for too many repeat clicks once a good decision is obvious.
   - Fix: support max-loading a recommended good from the route command strip,
     then later add per-market max buy/sell controls once the market rows are
     redesigned.
3. Contracts are visible, but their cargo requirements are not yet merged with
   route economics.
   - Fix: contract plotting should show required cargo cost, hold pressure,
     expected route risk, deadline slack, and whether the destination also has a
     profitable sell opportunity.
4. Shipyard comparison is powerful but visually dense.
   - Fix: split ships, equipment, crew, and captain training into tighter
     comparison modes with slot filters and route-fit deltas pinned near the
     current route.
5. The ocean affects route math, but the visual water still does not look like
   the same system the game is simulating.
   - Fix: run the production ocean architecture spike: shader water, buoyancy
     samples, route-visible current/wind, and canvas pixel/performance checks.

## Implemented Flow Improvement

The first improved flow is route planning:

- Select a destination.
- Read a compact sailing order directly above the map.
- See route time, risk, water/wear, best cargo, current hold margin, insurance,
  and destination authority in one band.
- Use `Load` to buy the best risk-adjusted cargo that fits cash, stock, and
  hold space.
- Use `Insure` when cargo coverage is available.
- Use `Sail` from the same command band.

## Exit Criteria

- Top five confusing surfaces have proposed fixes.
- At least one high-impact flow is improved in code.
- Unit tests cover the new max-load economy action.
- Browser smoke verifies route command visibility and no fresh console errors.
