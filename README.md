# Ocean Impact Lab

A local desktop ocean-impact simulator for dropping objects into water and
measuring buoyancy, splash response, sink time, and float duration.

## Fluid Grid Remap

The project is now being remapped away from Canvas 2D as the primary water path
so it can support high-resolution fluid grids. The target production engine is
WebGPU compute plus grid-backed rendering, with CPU logic kept as deterministic
reference and fallback infrastructure.

Start here:

- `docs/FLUID_GRID_REMAP.md` for the WebGPU fluid-grid architecture.
- `docs/TRACKING.md` for milestones, tasks, and gates.
- `docs/GITHUB_SETUP.md` for creating the GitHub remote once `gh` auth is fixed.
- `src/fluid/fluidGridContract.ts` for the code-level backend/gate contract.

Run the tracking gate:

```sh
npm run fluid:tracking
```

Run the local Electron WebGPU capability gate:

```sh
npm run fluid:capability
```

Run the WebGPU grid allocation and compute-step benchmark:

```sh
npm run fluid:grid
```

Run the WebGPU grid-backed render probe:

```sh
npm run fluid:render
```

Run the WebGPU rigid-body/fluid coupling gate:

```sh
npm run fluid:coupling
```

The current model is engine-first TypeScript: Archimedes displacement,
shape-aware submerged volume, center of buoyancy, waterplane inertia,
metacentric height, hydrostatic righting moment, angular damping, quadratic
air/water drag with Reynolds-aware effective drag coefficients,
resultant-vector aerodynamic and hydrodynamic drag, cross-flow hydrodynamic
lift for angled bluff bodies, water and air viscosity, waterline
capillary support with Bond-number diagnostics, surface tension splash scaling,
added mass, heave radiation memory, turbulent wake memory, entrained-water drag,
wave-relative roll damping, wave angular-excitation torque, depth-decayed wave
orbital kinematics, finite-depth Airy-wave dispersion, Morison-style wave excitation forces, off-center
hydrodynamic load moments, water-entry slam center-of-pressure and torque,
continuous waterline-crossing interpolation for impact timing, current drift,
water ingress, pressure-dependent leak/orifice flooding, porous
material absorption, internal free-surface stability loss for partially flooded
objects, impact energy, transient ventilated-entry cavities, air-dragged splash
droplets with secondary water-entry pulses, a damped free-surface wave grid,
depth-aware impact-wave propagation, directional oblique-entry wave asymmetry,
mass-conserving free-surface pulses, seabed impact impulses, and frictional
bottom contact. The WebGPU path now writes active object footprints, depth
impedance, and displacement impulses into the fluid grid, then feeds bounded
grid force deltas back into the next rigid-body physics step. Live diagnostics
are calculated in `src/physicsOcean.ts` and rendered by the app.

## Run

Install dependencies once:

```sh
npm install
```

Run the local Electron app:

```sh
npm run desktop:dev
```

For web-shell development only, run Vite:

```sh
npm run dev
```

## Build A Local App

Build the macOS desktop bundle:

```sh
npm run desktop:package:mac
```

The app is written to `release/Ocean Impact Lab-darwin-arm64/Ocean Impact Lab.app`
on Apple Silicon, or the matching architecture folder for the current machine.

## Verify

Run all unit and regression tests:

```sh
npm test
```

Run the production build:

```sh
npm run build
```

Run the Electron launch smoke:

```sh
npm run desktop:smoke
```

After packaging, run:

```sh
npm run desktop:package-smoke
```

## Physics Scope

This is a real-time engineering approximation, not full CFD. It is suitable for
interactive buoyancy, impact, and float-time experiments with realistic units
and defensible formulas.

Current validation checks include:

- Half-submerged sphere displacement.
- Archimedes equilibrium for a floating block.
- Expected seawater draft for fresh-water ice.
- Dense-object sink-to-seabed behavior with damped bottom contact.
- Seabed impact energy, rebound damping, friction impulse, and penetration reporting.
- Gravity-limited water-entry speed for a compact dense drop.
- Time-step-stable interpolated water-entry timing and impact speed.
- Energy-scaled splash generation.
- Directional oblique-entry surface waves with near-zero net free-surface volume error.
- Depth-aware impact-wave propagation in shallow versus deep water.
- Air-dragged spray droplets and secondary free-surface impacts.
- Hydrostatic righting moment and roll damping for floating bodies.
- Wave-slope angular velocity and wave-relative roll damping.
- Wave-slope angular acceleration and roll excitation from added water inertia.
- Off-center water drag, radiation, and wave loads feeding roll moment.
- Angle-of-attack cross-flow lift direction, shape scaling, and motion coupling.
- Heave stiffness, added mass, natural period, and radiation-force memory.
- Turbulent wake buildup, vortex-shedding frequency, and entrained-water drag.
- Surface-tension/capillary support for small objects at the waterline.
- Depth-decayed orbital wave velocity feeding drag and water-entry speed.
- Finite-depth wave dispersion with shallow-water wavelength and phase-speed limits.
- Morison-style wave inertia force from local fluid acceleration.
- Transient water-entry cavity ventilation reducing attached-flow forces.
- Angled water entry producing off-center slam torque.
- Impact energy transfer into a propagating free-surface disturbance.
- Low-Reynolds viscous drag versus high-Reynolds bluff-body drag.
- Resultant-vector air/water drag direction and horizontal motion damping.
- Finite terminal velocity for dense objects in water.
- High-Reynolds and high-Weber turbulent water-entry classification.
- Hydrostatic-head-driven leak ingress and leak-area-sensitive float duration.
- Internal free-surface GM loss and slosh moment for partially flooded objects.
- WebGPU object-grid coupling with bounded local samples, nonzero displacement
  impulse, and finite force-feedback diagnostics for a concrete-cube drop.

True near-real ocean fidelity would require a native or GPU fluid solver,
validated material data, free-surface turbulence, full 6-DOF rigid body motion,
and stronger calibration against reference footage or lab data.
