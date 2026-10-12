#!/usr/bin/env bash
#
# Attach the built .xpi to a GitHub Release named after the manifest version.
# Run by the Woodpecker `release` step after build.sh has written dist/.
#
# The .xpi is unsigned: a listed AMO version is signed only once review
# approves it, possibly days later. The signed file is downloaded from the AMO
# Developer Hub; this release is the exact build that was submitted.
#
# Needs: gh, GH_TOKEN (contents: write on the repo), CI_REPO, CI_COMMIT_SHA.
#
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' fx-local-translator/manifest.json \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
TAG="v${VERSION}"
XPI="dist/locallingo-${VERSION}.xpi"

[[ -f "$XPI" ]] || { echo "missing $XPI; run ./build.sh first" >&2; exit 1; }

# A manual re-run on the same version must not fail or duplicate the release:
# replace the asset on the existing release instead.
if gh release view "$TAG" --repo "$CI_REPO" >/dev/null 2>&1; then
  gh release upload "$TAG" "$XPI" --repo "$CI_REPO" --clobber
  echo "Updated $XPI on existing release $TAG"
else
  gh release create "$TAG" "$XPI" \
    --repo "$CI_REPO" \
    --target "$CI_COMMIT_SHA" \
    --title "LocalLingo ${VERSION}" \
    --notes "Unsigned build of ${VERSION} as submitted to addons.mozilla.org. Install the signed version from AMO once it is approved."
  echo "Created release $TAG with $XPI"
fi
