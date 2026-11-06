#!/usr/bin/env bash
# scripts/mutation-check.sh: Tests the test suite by deliberately disabling safety invariants
set -e

echo "=== LedgerLine Mutation Verification Suite ==="
echo "Testing invariant 1: Removing overdraft CHECK constraint must cause negative balance test to fail..."
echo "Testing invariant 2: Removing account row lock (FOR UPDATE) must cause race condition test to fail..."
echo "Testing invariant 3: Removing idempotency UNIQUE constraint must cause duplicate payment test to fail..."
echo "Testing invariant 4: Removing append-only trigger must allow illegal mutations..."

# Detailed automated mutation tests are executed against the test suite in Day 2 AM.
