# Imported source archive

This directory preserves the original Vercel source for reference. It is not an
installable application and is excluded from deployment.

The obsolete npm lockfile was removed because it retained vulnerable versions
that the migrated application no longer uses. Install and run the maintained
application from the workspace root with pnpm; `pnpm-lock.yaml` is the active
dependency lockfile.
