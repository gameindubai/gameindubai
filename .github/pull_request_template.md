## What changed

## Checklist (see CLAUDE.md)
- [ ] Fast suite green before and after: `python -m pytest -q -m "not live and not perf"`
- [ ] Touched runtime game code? `python3 tools/audit.py <game>` is within budget (docs/PERFORMANCE.md)
- [ ] No requested feature hidden/removed to make things fit; trade-offs listed below
- [ ] Shared code went into blockkit's shared helpers, not copied between games
- [ ] Docs updated (spec, registry, README, CONCEPTS table, COMMON_MISTAKES for any bug fixed + a test that failed on the broken code)

## Trade-offs the owner should know about
