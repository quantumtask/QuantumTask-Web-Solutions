#!/usr/bin/env bash
set -euo pipefail

UPDATE_GH_PAGES=false
if [[ ${1-} == "--update-gh-pages" ]]; then
  UPDATE_GH_PAGES=true
fi

run() {
  echo "+ $*"
  "$@"
}

echo "=== Repo info ==="
run pwd
run git rev-parse --show-toplevel
run git remote -v
run git branch --show-current
run git status --porcelain
run ls -la index.html
run git log -3 --oneline

# Ensure on main
current_branch="$(git branch --show-current)"
if [[ "${current_branch}" != "main" ]]; then
  run git checkout main
fi
run git pull --rebase --autostash origin main

# Check for changes
status_output="$(git status --porcelain)"
if [[ -z "${status_output}" ]]; then
  echo "Nothing to commit"
  exit 1
fi

run git add -A
run git status
run git commit -m "Publish latest site files"

run git push origin main

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin -h refs/heads/main | awk '{print $1}')"
echo "LOCAL:  ${LOCAL}"
echo "REMOTE: ${REMOTE}"
if [[ "${LOCAL}" != "${REMOTE}" ]]; then
  echo "ERROR: main remote hash does not match local HEAD" >&2
  exit 1
fi

# gh-pages detection
GH_REMOTE_HASH="$(git ls-remote --heads origin gh-pages | awk 'NR==1 {print $1}')"
if [[ -n "${GH_REMOTE_HASH}" ]]; then
  echo "gh-pages remote head: ${GH_REMOTE_HASH}"
  if [[ "${GH_REMOTE_HASH}" != "${REMOTE}" ]]; then
    echo "If your site is served from gh-pages, it will still show old content until gh-pages is updated."
  else
    echo "gh-pages matches main."
  fi
fi

if ${UPDATE_GH_PAGES}; then
  run git fetch origin
  if git show-ref --verify --quiet refs/heads/gh-pages; then
    run git checkout gh-pages
  else
    if [[ -n "${GH_REMOTE_HASH}" ]]; then
      run git checkout -b gh-pages origin/gh-pages
    else
      run git checkout --orphan gh-pages
    fi
  fi

  run git reset --hard main
  run git push origin gh-pages --force-with-lease

  GH_LOCAL="$(git rev-parse HEAD)"
  GH_REMOTE="$(git ls-remote origin -h refs/heads/gh-pages | awk '{print $1}')"
  echo "GH_LOCAL:  ${GH_LOCAL}"
  echo "GH_REMOTE: ${GH_REMOTE}"
  if [[ "${GH_LOCAL}" != "${GH_REMOTE}" ]]; then
    echo "ERROR: gh-pages remote hash does not match local gh-pages" >&2
    exit 1
  fi

  run git checkout main
fi

echo "Done."
