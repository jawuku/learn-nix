<!--
  Thanks for contributing! Please fill in what you can and tick the checklist.
  Full contributor guide: CONTRIBUTING.md
-->

## What does this PR do?

<!-- One or two sentences: what changed and why. Link the issue if there is one (e.g. "Closes #12"). -->

- 

## Type of change

- [ ] Lesson content (data files / curriculum)
- [ ] UI / components / styling
- [ ] In-browser runtime / evaluator
- [ ] Build / config / tooling
- [ ] Docs (README, CONTRIBUTING, comments)
- [ ] CI / workflows

## Checklist

- [ ] `yarn audit` passes (**ALL CLEAN** — this is what CI runs on every push)
- [ ] `yarn build` compiles
- [ ] `yarn smoke` passes with **0 page errors / 0 console errors**
- [ ] Lesson data changes are mirrored in `curriculum.md` (and vice versa)
- [ ] Fetcher hashes (`sha256`/`hash`) came from a real prefetch, not a guess
- [ ] No stray `nix-audit-report.json` in the diff (it's gitignored)

<!-- For reviewers -->
## Notes for reviewers

<!-- Anything you'd like called out: tricky spots, trade-offs, areas needing extra scrutiny. -->
- 

---

_Validation commands (run from `frontend/`):_

```bash
yarn audit          # fast content audit, no browser needed
yarn build          # production build
yarn smoke          # full browser smoke test (needs dev server or static build; see CONTRIBUTING.md)
```
