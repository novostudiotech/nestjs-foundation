# Working with Patches

This document explains how to work with patched dependencies in this project using pnpm's built-in patching system.

## Overview

Sometimes you need to modify third-party dependencies to fix bugs or add features before they're available upstream. pnpm provides a built-in patching mechanism that automatically applies patches during installation.

## How It Works

**pnpm automatically applies patches** when you run `pnpm install`. No additional scripts or postinstall hooks are needed.

When pnpm installs a patched package, it extracts the package, applies the patch file, and stores the patched version with a `patch_hash` identifier. You can verify patches are applied by checking `node_modules/.pnpm` - patched packages will have `patch_hash=...` in their directory names.

### Configuration

Patches are configured in `pnpm-workspace.yaml`:

```yaml
patchedDependencies:
  '@thallesp/nestjs-better-auth': patches/@thallesp__nestjs-better-auth+2.2.0.patch
  better-call: patches/better-call+1.1.7.patch
```

The lockfile (`pnpm-lock.yaml`) also tracks patches automatically.

## Current Patches

See the `patches/` directory for all current patch files and their details.

## Creating a New Patch

1. **Prepare the package:**
   ```bash
   pnpm patch <package-name>@<version>
   ```
   This extracts the package to a temporary directory and prints its path.

2. **Make your changes:**
   Navigate to the temporary directory and edit files as needed.

3. **Generate the patch:**
   ```bash
   pnpm patch-commit /tmp/path-to-temp-dir
   ```
   This generates a patch file in `patches/`, updates `pnpm-workspace.yaml`, and updates `pnpm-lock.yaml`.

4. **Verify:**
   Run `pnpm install` and check `node_modules/.pnpm` for the `patch_hash` identifier.

## Updating Patched Packages

When a patched package is updated:

1. Check if the patch is still needed (review changelog, test new version)
2. If needed: create a new patch for the new version, remove the old patch file
3. If not needed: remove the patch file and its entry from `pnpm-workspace.yaml`

## Removing a Patch

1. Remove the patch file from `patches/` directory
2. Remove the entry from `pnpm-workspace.yaml`
3. Run `pnpm install`

## Best Practices

- **Document patches:** Add comments in patch files explaining the fix, link to upstream issues/PRs
- **Keep patches minimal:** Only patch what's necessary, prefer upstream fixes when possible
- **Review regularly:** Check if patches are still needed when updating dependencies
- **Test after patching:** Run tests to ensure patches work correctly

## Troubleshooting

**Patch fails to apply:**
- Check if the package version changed
- Verify the patch file is correct
- Recreate the patch for the current version

**Patch not being applied:**
- Verify `patchedDependencies` is in `pnpm-workspace.yaml`
- Check `pnpm-lock.yaml` contains patch metadata
- Run `pnpm install --force` to reinstall
- Check `node_modules/.pnpm` for `patch_hash` in directory names

## Related Documentation

- [pnpm patching documentation](https://pnpm.io/cli/patch)
- [pnpm patchedDependencies setting](https://pnpm.io/settings#patcheddependencies)
