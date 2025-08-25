# Branch Protection Configuration

Apply these settings in GitHub repository settings → Branches → Branch protection rules for `master` branch:

## Required Settings

### Protect matching branches
- ✅ **Restrict pushes that create files that match a pattern**
- ✅ **Require a pull request before merging**
  - ✅ **Require approvals**: 1
  - ✅ **Dismiss stale PR approvals when new commits are pushed**
  - ✅ **Require review from code owners**

### Required status checks before merging
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

**Required checks** (must ALL pass):
- `Setup Dependencies`
- `Lint Code`
- `Check Formatting` 
- `TypeScript Type Check`
- `Run Tests`
- `Build Project`

### Additional restrictions
- ✅ **Require signed commits**
- ✅ **Require linear history**
- ✅ **Do not allow bypassing the above settings**
- ✅ **Restrict pushes that create files that match a pattern**: `*.log`, `*.tmp`, `console.*`

## Quality Gate Enforcement

With these settings, **NO code can be merged** that fails any quality check:

1. **ESLint violations** → Blocks at "Lint Code" check
2. **Debug statements in tests** → Blocks at "Lint Code" check  
3. **Undocumented test skips** → Blocks at "Lint Code" check
4. **TypeScript compilation errors** → Blocks at "TypeScript Type Check"
5. **Test failures** → Blocks at "Run Tests" check
6. **Build failures** → Blocks at "Build Project" check

## Automated Quality Gates

The pipeline includes automated structural validation:
- Pre-commit hooks prevent local commits with quality violations
- CI/CD pipeline enforces same quality standards remotely
- Jest reporter fails test runs on quality violations
- Build verification ensures deployment readiness

**Result**: Zero-tolerance quality enforcement with no manual oversight gaps.