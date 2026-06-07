# GitHub Setup

The local repository has been initialized. The GitHub remote provided by the
user is:

```text
https://github.com/AC-21/ocean.git
```

Pushing from this machine may still need GitHub authentication because
`gh auth status` reports invalid GitHub tokens.

After re-authenticating:

```sh
gh auth login -h github.com
git remote add origin https://github.com/AC-21/ocean.git
git push -u origin main
```

Seed the initial tracking issues from `docs/TRACKING.md`. Suggested first issue
set:

```sh
gh issue create --title "FG-00: Repository and tracking foundation" --label fluid-grid --label gate --body-file docs/TRACKING.md
gh issue create --title "FG-01: WebGPU capability shell" --label fluid-grid --label webgpu --label physics --body "Exit gate: G-FG-01. Detect navigator.gpu, adapter/device limits, and intentional fallback."
gh issue create --title "FG-02: GPU grid allocation and stepping" --label fluid-grid --label webgpu --body "Exit gate: G-FG-02. Allocate and step the height/velocity/foam grid inside frame budget."
gh issue create --title "FG-03: Grid-backed water rendering" --label fluid-grid --label renderer --label webgpu --body "Exit gate: G-FG-03. WebGPU renderer is primary; Canvas 2D is diagnostic only."
gh issue create --title "FG-04: Two-way rigid-body/fluid coupling" --label fluid-grid --label physics --body "Exit gate: G-FG-04. Object drop, slam, drag, buoyancy, and float/sink behavior use grid-backed coupling."
gh issue create --title "FG-05: Splash, foam, and spray from grid state" --label fluid-grid --label physics --body "Exit gate: G-FG-05. Impact energy creates splash/foam/spray and secondary reentry pulses."
gh issue create --title "FG-06: Calibration and near-realism validation" --label fluid-grid --label calibration --label gate --body "Exit gate: G-FG-06. Reference cases pass accepted error bounds."
```

GitHub milestones can be created from the same FG-00 through FG-06 names in the
web UI, or through the GitHub API after auth is fixed.
