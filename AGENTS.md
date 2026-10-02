# AGENTS.md

## Active project boundary
This independent copy is **WebGL Glass Bar**, repository `dimasdont-lab/WEBGL_glass_bar`.
Work only in `M:\VoiceFinance\WebGL Glass Bar`. Do not edit or push the main Voice Finance or Test Liquid Glass projects.
The initial full main-project copy is preserved in commit `24d7ebe`.
Current task: remove the legacy dock and its rendering/interaction code, keep all finance pages, and implement the dock from `https://claude.ai/artifact/U8mAco7sLPvSbBfHh3Xgoq` after obtaining its source. Do not substitute a different example silently.
Older handoff documents describe the copied application's background; their deployment destinations and previous tasks are superseded by this project boundary and the current user request.

## Project
Voice Finance Free — mobile-first finance PWA.

## Core rule
Do not add paid runtime services or APIs. The app must remain usable without per-request/per-minute charges.

## Priorities
1. Reliability on iPhone Safari.
2. Manual transaction flows must never depend on voice.
3. Voice processing should remain local/open-source.
4. Mixed Ukrainian/Polish/English input is expected.
5. Keep the approved near-black Apple-like UI and pastel-red accent.
6. Persist user finance data locally for this prototype.
7. Test before claiming a flow works.

## Git
Repository: `dimasdont-lab/WEBGL_glass_bar`

Make focused commits with descriptive messages.
Before pushing, verify the app locally.
Prefer a feature branch + PR if the environment makes that easier; otherwise push `main` only after validation.

## Read first
Read `CODEX_HANDOFF.md` and `TASK.md` before editing.
