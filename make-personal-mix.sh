#!/usr/bin/env bash
# Exit on first error
set -e

# Run our build
npm run build

# Create a new package
npm pack

# Checkout our personal branch
git_branch="dev/personal.mix"
git checkout -B "$git_branch"

# Create a new commit and force push
git add karma-*.tgz
git commit -m "Built latest tarball"
git push origin "$git_branch" --force
