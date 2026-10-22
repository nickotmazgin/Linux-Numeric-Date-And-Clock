## Summary

Describe the changes and rationale.

## Checks

- [ ] `./tools/build.sh && ./tools/validate.sh` pass
- [ ] `./tools/nested-smoke-test.sh` prints `SMOKE TEST PASSED`
- [ ] `npx -y eslint@9 .` is clean
- [ ] Release ZIP does not include `schemas/gschemas.compiled`
- [ ] CHANGELOG.md updated when `version-name` changes
