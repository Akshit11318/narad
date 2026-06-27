# NARAD Voting System - Test Report

## Executive Summary

All 100 votes across 10 candidates were correctly aggregated using Paillier homomorphic encryption. The aggregation produces exact vote counts matching the expected values.

---

## Issues Found and Fixed

### 1. Invalid Paillier Modulus (Critical)
**Problem:** Hardcoded N was even (`N % 2 == 0`). Paillier requires N = p×q (odd primes).
**Fix:** Generated proper semiprime: `N = 0x400000000000000000000000211d1b86000000000000000001b131395144546b` (255-bit, odd)

### 2. Secret Key Equals Generator (Critical)
**Problem:** `skA == H` (degenerate key, breaks decryption).
**Fix:** Separate random `skA = 0x2481c95a9eb72624f93de30ccd1118fbccfb637cd367ad167433a866751833b`

### 3. Crypto Params Source Mismatch (Critical)
**Problem:** Aggregation read N/H/skA from blockchain (old even N) instead of SystemParams (new odd N).
**Fix:** Aggregation service now reads from `SystemParams` table, not blockchain election data.

### 4. Bit-Packing Mismatch (Major)
**Problem:** C used 25-bit slots, JS fallback used 32-bit.
**Fix:** Unified to 25-bit slots with reverse ordering.

### 5. Missing skA⁻¹ Step (Major)
**Problem:** JS computed `L(P')` but skipped `× skA⁻¹ mod N`.
**Fix:** Added `sum = L(P') × skA⁻¹ mod N` step.

### 6. Aux Product Modulus (Major)
**Problem:** Aux product computed `mod N` instead of `mod N²`.
**Fix:** Changed to `mod N²` to match ciphertext space.

### 7. C Module modular_inverse Bug (Major)
**Problem:** C `gcd()` pre-check incorrectly reported skA as not coprime to N, falling back to `skA_inv = 1`.
**Fix:** Removed GCD pre-check, direct `mp_invmod` call.

### 8. Frontend Cache Persistence (Minor)
**Problem:** Voter1's `hasVoted` state persisted when voter2 logged in.
**Fix:** `logout()` clears `localStorage` + `sessionStorage` + full page reload.

### 9. RBAC Missing (Major)
**Problem:** All users had admin access.
**Fix:** Added `role` column, `adminMiddleware`, role-based nav.

---

## Test Results

```
======================================================================
  NARAD ELECTION RESULTS - 100 voters, 10 candidates
======================================================================
  [PASS] Alice     :     7 /     7 ##############
  [PASS] Bob       :    11 /    11 ######################
  [PASS] Carol     :     8 /     8 ################
  [PASS] Dave      :    15 /    15 ##############################
  [PASS] Eve       :     7 /     7 ##############
  [PASS] Frank     :    10 /    10 ####################
  [PASS] Grace     :    10 /    10 ####################
  [PASS] Heidi     :     7 /     7 ##############
  [PASS] Ivan      :    11 /    11 ######################
  [PASS] Judy      :    14 /    14 ############################
======================================================================
  SUCCESS - All 100 votes correctly aggregated!
  Aggregation time: 0.02s
  Crypto: N=255bit odd=True skA!=H=True
======================================================================
```

## Run Test

```bash
# Small test (100 voters)
python3 test/full_system_test.py

# Full scale (10,000 voters, 10 candidates)
NUM_VOTERS=10000 NUM_CANDIDATES=10 python3 test/full_system_test.py
```
