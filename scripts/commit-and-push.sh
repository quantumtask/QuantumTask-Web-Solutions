#!/usr/bin/env bash
set -euo pipefail

echo "Running git status (pre-add)..."
git status

echo "Adding all changes..."
git add -A

echo "Running git status (post-add)..."
git status

if git diff --cached --quiet; then
  echo "Nothing to commit. Exiting." >&2
  exit 1
fi

echo "Committing..."
git commit -m "Sync packages meta cards across service pages"

echo "Pushing to origin main..."
git push origin main

echo "Done."
