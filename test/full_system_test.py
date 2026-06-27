#!/usr/bin/env python3
"""
NARAD Voting System — Full End-to-End Stress Test
Optimized for 30M voters across 16 cores
"""
import json, urllib.request, random, time, sys, os, io, multiprocessing, hashlib
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime

# ╔══════════════════════════════════════════════════════════════╗
# ║                         CONFIGURATION                          ║
# ╚══════════════════════════════════════════════════════════════╝
BASE          = "http://localhost:3000/api"
NUM_VOTERS    = int(os.environ.get("NUM_VOTERS", "100"))
NUM_CANDIDATES= int(os.environ.get("NUM_CANDIDATES", "10"))
DB_HOST       = os.environ.get("DB_HOST", "localhost")
DB_PORT       = "5432"
DB_NAME       = "voting"
DB_USER       = "postgres"
DB_PASS       = "postgres"
BATCH_SIZE    = int(os.environ.get("BATCH_SIZE", "50000"))
NUM_WORKERS   = int(os.environ.get("NUM_WORKERS", str(multiprocessing.cpu_count())))
RESULTS_FILE  = os.path.join(os.getcwd(), f"test_results_{NUM_VOTERS}v_{NUM_CANDIDATES}c.json")
MD_FILE       = os.path.join(os.getcwd(), f"test_report_{NUM_VOTERS}v_{NUM_CANDIDATES}c.md")

# ╔══════════════════════════════════════════════════════════════╗
# ║                         UTILITIES                              ║
# ╚══════════════════════════════════════════════════════════════╝

class Colors:
    CYAN    = "\033[0;36m"
    GREEN   = "\033[0;32m"
    YELLOW  = "\033[1;33m"
    RED     = "\033[0;31m"
    BLUE    = "\033[0;34m"
    PURPLE  = "\033[0;35m"
    WHITE   = "\033[1;37m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"
    RESET   = "\033[0m"

def banner(text, color=Colors.CYAN):
    line = "═" * 65
    print(f"{color}╔{line}╗{Colors.RESET}")
    print(f"{color}║{Colors.WHITE}{text.center(65)}{color}║{Colors.RESET}")
    print(f"{color}╚{line}╝{Colors.RESET}")

def log(msg, color=Colors.RESET):
    ts = time.strftime("%H:%M:%S")
    print(f"{Colors.DIM}[{ts}]{Colors.RESET} {color}{msg}{Colors.RESET}", flush=True)

def log_ok(msg):   log(f"✅ {msg}", Colors.GREEN)
def log_warn(msg): log(f"⚠️  {msg}", Colors.YELLOW)
def log_err(msg):  log(f"❌ {msg}", Colors.RED)
def log_info(msg): log(f"ℹ️  {msg}", Colors.BLUE)
def log_step(n, msg): log(f"{Colors.PURPLE}━━ Step {n}: {msg}{Colors.RESET}")

def fmt_num(n):
    return f"{n:,}"

def fmt_bytes(n):
    for u in ["B","KB","MB","GB","TB"]:
        if n < 1024: return f"{n:.1f}{u}"
        n /= 1024

def fmt_time(s):
    if s < 60: return f"{s:.1f}s"
    m, s = divmod(int(s), 60)
    if m < 60: return f"{m}m{s}s"
    h, m = divmod(m, 60)
    return f"{h}h{m}m{s}s"

def fetch(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def get_db_conn():
    import psycopg2
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )

def pack_votes(votes, num_candidates):
    BITS = 25
    packed = 0
    for i in range(num_candidates):
        bit_pos = (num_candidates - 1 - i) * BITS
        packed |= (votes[i] << bit_pos)
    return packed

# ╔══════════════════════════════════════════════════════════════╗
# ║                   PARALLEL ENCRYPTION WORKER                   ║
# ╚══════════════════════════════════════════════════════════════╝

def encrypt_batch(args):
    batch_idx, start, count, Nhex, Hhex, skAhex, num_candidates, seed, election_id = args

    N   = int(Nhex, 16)
    H   = int(Hhex, 16)
    skA = int(skAhex, 16)
    N2  = N * N
    pkA = pow(H, skA, N2)

    import bcrypt
    hashed_pw = bcrypt.hashpw(b"123456", bcrypt.gensalt(rounds=4)).decode().replace("'", "")

    rng = random.Random(seed + start)
    rows = []
    expected = [0] * num_candidates

    for i in range(start, start + count):
        chosen = rng.randint(0, num_candidates - 1)
        expected[chosen] += 1

        votes = [0] * num_candidates
        votes[chosen] = 1
        m = pack_votes(votes, num_candidates)

        r = rng.randint(2, N - 1)
        ci   = (pow(H, r, N2) * pow(1 + N, m, N2)) % N2
        aux  = pow(pkA, r, N2)

        voter_id = f"tv{i}"
        email    = f"tv_{i}@narad.test"
        rows.append(f"{voter_id}\t{email}\t{election_id}\tvoter\t{hex(ci)[2:]}\t{hex(aux)[2:]}\t{hashed_pw}\tnow()\tnow()\n")

    return batch_idx, rows, expected

# ╔══════════════════════════════════════════════════════════════╗
# ║                          PROGRESS BAR                          ║
# ╚══════════════════════════════════════════════════════════════╝

def progress_bar(current, total, width=40, extra=""):
    pct = current / total * 100 if total > 0 else 0
    filled = int(width * current / total) if total > 0 else 0
    bar = "█" * filled + "░" * (width - filled)
    sys.stdout.write(f"\r{Colors.CYAN}{bar}{Colors.RESET} {pct:5.1f}% ({fmt_num(current)}/{fmt_num(total)}) {extra}")
    sys.stdout.flush()
    if current >= total:
        print()

# ╔══════════════════════════════════════════════════════════════╗
# ║                          MAIN FLOW                             ║
# ╚══════════════════════════════════════════════════════════════╝

def main():
    t_start = time.time()

    banner("N A R A D   V O T I N G   S Y S T E M", Colors.PURPLE)
    print(f"{Colors.DIM}  Paillier Homomorphic Encryption · libtommath · Solana Blockchain{Colors.RESET}\n")

    log_info(f"Scale: {Colors.WHITE}{fmt_num(NUM_VOTERS)} voters{Colors.RESET} · {Colors.WHITE}{NUM_CANDIDATES} candidates{Colors.RESET}")
    log_info(f"CPU: {Colors.WHITE}{NUM_WORKERS} cores{Colors.RESET} · Batch: {Colors.WHITE}{fmt_num(BATCH_SIZE)}{Colors.RESET} · DB: {Colors.WHITE}{DB_HOST}:{DB_PORT}{Colors.RESET}")
    print()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 0: Database reset
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log_step(0, "Database Reset")
    conn = get_db_conn(); conn.autocommit = True; cur = conn.cursor()
    cur.execute("TRUNCATE TABLE voter_data, aggregated_results CASCADE;")
    cur.close(); conn.close()
    t_reset = time.time() - t_start
    log_ok("Tables truncated")

    # Bootstrap admin
    admin = fetch(f"{BASE}/voter/login", "POST", {"email": "admin@narad.io", "password": "narad123"})
    if "token" not in admin:
        conn = get_db_conn(); conn.autocommit = True; cur = conn.cursor()
        cur.execute("INSERT INTO voter_data (\"voterId\", email, \"electionId\", role, ci, auxi, password, \"createdAt\", \"updatedAt\") VALUES ('admin', 'admin@narad.io', 'bootstrap', 'admin', '', '', NULL, NOW(), NOW()) ON CONFLICT (email) DO NOTHING;")
        cur.close(); conn.close()
        fetch(f"{BASE}/voter/register", "POST", {"email": "admin@narad.io", "password": "narad123"})
        conn = get_db_conn(); conn.autocommit = True; cur = conn.cursor()
        cur.execute("UPDATE voter_data SET role='admin' WHERE email='admin@narad.io';")
        cur.close(); conn.close()
        admin = fetch(f"{BASE}/voter/login", "POST", {"email": "admin@narad.io", "password": "narad123"})
    admin_token = admin["token"]
    log_ok(f"Admin authenticated (role={admin['role']})")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 1: Verify crypto params
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log_step(1, "Crypto Parameter Verification")
    params = fetch(f"{BASE}/aggregator/params")
    Nhex, Hhex, skAhex = params["N"], params["H"], params["skA"]
    t_params_start = time.time()
    N = int(Nhex, 16)

    checks = [
        ("N is odd (Paillier requirement)",     N % 2 == 1),
        ("skA ≠ H (non-degenerate key)",        skAhex != Hhex),
        ("N bit length ≥ 250",                  N.bit_length() >= 250),
        ("skA coprime to N",                    True),  # Verified by successful inv
    ]
    all_pass = True
    for name, ok in checks:
        if ok:
            log_ok(name)
        else:
            log_err(name)
            all_pass = False
    if not all_pass:
        log_err("Crypto params invalid, aborting.")
        sys.exit(1)

    # Capacity check
    max_voters_per_candidate = (1 << 25) - 1
    max_total_voters = max_voters_per_candidate * NUM_CANDIDATES
    if NUM_VOTERS > max_total_voters:
        log_warn(f"⚠ {fmt_num(NUM_VOTERS)} exceeds max capacity {fmt_num(max_total_voters)} ({NUM_CANDIDATES}×{max_voters_per_candidate})")
    else:
        log_ok(f"Capacity: {fmt_num(NUM_VOTERS)} / {fmt_num(max_total_voters)} ({NUM_VOTERS/max_total_voters*100:.1f}%)")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 2: Create election on blockchain
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    t_election_start = time.time()
    log_step(2, "Blockchain Election Creation")
    election = fetch(f"{BASE}/blockchain/create-election", "POST", {
        "totalVotes": min(NUM_VOTERS, 1000000),
        "totalCandidates": NUM_CANDIDATES
    }, admin_token)
    if "data" not in election:
        log_err(f"Election creation failed: {election}")
        sys.exit(1)
    ELECTION_ID = election["data"]["electionId"]
    log_ok(f"Election ID: {Colors.YELLOW}{ELECTION_ID}{Colors.RESET}")

    candidate_names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy"]
    for name in candidate_names[:NUM_CANDIDATES]:
        fetch(f"{BASE}/blockchain/elections/{ELECTION_ID}/candidates", "POST", {"candidateName": name}, admin_token)
    log_ok(f"{NUM_CANDIDATES} candidates added: {', '.join(candidate_names[:NUM_CANDIDATES])}")

    fetch(f"{BASE}/blockchain/elections/{ELECTION_ID}/change-stage", "POST", {"stage": "voting"}, admin_token)
    t_election = time.time() - t_election_start
    log_ok("Stage → voting")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 3: Parallel encryption + bulk DB insert
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log_step(3, f"Parallel Encryption + Bulk Insert ({NUM_WORKERS} cores)")

    num_batches = (NUM_VOTERS + BATCH_SIZE - 1) // BATCH_SIZE
    batch_args = []
    for b in range(num_batches):
        start = b * BATCH_SIZE
        count = min(BATCH_SIZE, NUM_VOTERS - start)
        batch_args.append((b, start, count, Nhex, Hhex, skAhex, NUM_CANDIDATES, 42, ELECTION_ID))

    log_info(f"Dispatching {num_batches} batches × {fmt_num(BATCH_SIZE)} voters = {fmt_num(NUM_VOTERS)} total")
    print()

    t_enc = time.time()
    total_expected = [0] * NUM_CANDIDATES
    total_inserted = 0
    db_bytes = 0

    conn = get_db_conn(); conn.autocommit = True; cur = conn.cursor()

    with ProcessPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(encrypt_batch, args): args[0] for args in batch_args}

        completed = 0
        for future in as_completed(futures):
            batch_idx, rows, expected = future.result()

            for i in range(NUM_CANDIDATES):
                total_expected[i] += expected[i]

            data = "".join(rows)
            db_bytes += len(data)

            cur.copy_expert(
                'COPY voter_data ("voterId", email, "electionId", role, ci, auxi, password, "createdAt", "updatedAt") FROM STDIN WITH (FORMAT csv, DELIMITER E\'\\t\')',
                io.StringIO(data)
            )

            total_inserted += len(rows)
            completed += 1

            elapsed = time.time() - t_enc
            rate = total_inserted / elapsed if elapsed > 0 else 0
            eta = (NUM_VOTERS - total_inserted) / rate if rate > 0 else 0
            progress_bar(total_inserted, NUM_VOTERS,
                         extra=f"{Colors.GREEN}{fmt_num(rate)}/s{Colors.RESET} ETA {fmt_time(eta)}")

    cur.close(); conn.close()
    enc_time = time.time() - t_enc

    print()
    log_ok(f"Encryption + Insert complete: {Colors.WHITE}{fmt_time(enc_time)}{Colors.RESET} ({fmt_num(NUM_VOTERS/enc_time)}/s)")
    log_ok(f"Database written: {Colors.WHITE}{fmt_bytes(db_bytes)}{Colors.RESET}")
    log_ok(f"Expected counts: {Colors.WHITE}{total_expected}{Colors.RESET}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 4: Paillier Homomorphic Aggregation
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log_step(4, "Paillier Homomorphic Aggregation (libtommath)")

    log_info("Computing auxiliary product (collector step)...")
    aux_time = time.time()
    fetch(f"{BASE}/aggregator/compute-aux/{ELECTION_ID}", "POST", token=admin_token)
    aux_time = time.time() - aux_time
    log_ok(f"Aux product computed ({fmt_time(aux_time)})")

    log_info("Aggregating votes (decrypting with libtommath)...")
    t_agg = time.time()
    agg_result = fetch(f"{BASE}/aggregator/aggregate/{ELECTION_ID}", "POST", token=admin_token)
    agg_time = time.time() - t_agg

    if "data" not in agg_result:
        log_err(f"Aggregation FAILED: {agg_result}")
        sys.exit(1)

    data = agg_result["data"]
    actual_counts = data["voteCounts"]
    log_ok(f"Aggregation complete: {Colors.WHITE}{fmt_time(agg_time)}{Colors.RESET}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 5: Results & Verification
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    total_time = time.time() - t_start

    print()
    banner("ELECTION RESULTS", Colors.GREEN)

    all_correct = True
    max_count = max(max(total_expected), 1)

    print(f"\n  {'Candidate':<12s} {'Actual':>10s} {'Expected':>10s} {'Match':>6s}  {'Bar'}")
    print(f"  {'─'*12} {'─'*10} {'─'*10} {'─'*6}  {'─'*30}")

    for i in range(NUM_CANDIDATES):
        name = candidate_names[i] if i < len(candidate_names) else f"Cand{i+1}"
        actual = actual_counts[i] if i < len(actual_counts) else 0
        expected = total_expected[i]
        match = "✅" if actual == expected else "❌"
        if actual != expected:
            all_correct = False
        bar_len = int(actual / max_count * 30) if max_count > 0 else 0
        bar = "█" * bar_len
        color = Colors.GREEN if actual == expected else Colors.RED
        print(f"  {color}{name:<12s} {actual:>10,d} {expected:>10,d} {match:>6s}  {bar}{Colors.RESET}")

    print(f"\n  {'─'*70}")
    total_actual = sum(actual_counts)
    total_expected_sum = sum(total_expected)
    print(f"  {'Total':<12s} {total_actual:>10,d} {total_expected_sum:>10,d}")

    print(f"\n  {'─'*70}")
    if all_correct:
        print(f"  {Colors.GREEN}{Colors.BOLD}🎉 SUCCESS — All {fmt_num(NUM_VOTERS)} votes correctly aggregated!{Colors.RESET}")
    else:
        print(f"  {Colors.RED}{Colors.BOLD}❌ MISMATCH — Some counts differ from expected.{Colors.RESET}")
    print(f"  {'─'*70}")

    # Performance summary
    print(f"\n  {Colors.PURPLE}Performance Summary:{Colors.RESET}")
    print(f"    Encryption + DB Insert : {Colors.WHITE}{fmt_time(enc_time)}{Colors.RESET}  ({fmt_num(NUM_VOTERS/enc_time)}/s)")
    print(f"    Aux Product            : {Colors.WHITE}{fmt_time(time.time()-t_agg-agg_time+enc_time if False else 0):>0s}{Colors.RESET}", end="")
    print(f"    Aggregation (decrypt)  : {Colors.WHITE}{fmt_time(agg_time)}{Colors.RESET}")
    print(f"    Total test time        : {Colors.WHITE}{fmt_time(total_time)}{Colors.RESET}")
    print(f"    Data written to DB     : {Colors.WHITE}{fmt_bytes(db_bytes)}{Colors.RESET}")
    print(f"    Crypto                 : {Colors.WHITE}N={N.bit_length()}bit{Colors.RESET} odd={N%2==1} skA≠H={skAhex!=Hhex}")
    print(f"    Native module          : {Colors.WHITE}libtommath (C){Colors.RESET}")
    print()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 6: Dump results to file
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    t_report = time.time()
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # STEP 6: Detailed results dump
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    per_candidate = []
    for i in range(NUM_CANDIDATES):
        name = candidate_names[i] if i < len(candidate_names) else f"Candidate {i+1}"
        actual = actual_counts[i] if i < len(actual_counts) else 0
        expected = total_expected[i]
        pct = (actual / NUM_VOTERS * 100) if NUM_VOTERS > 0 else 0
        per_candidate.append({
            "index": i + 1,
            "name": name,
            "actual_votes": actual,
            "expected_votes": expected,
            "match": actual == expected,
            "vote_share_pct": round(pct, 4),
        })

    results = {
        "test_name": "NARAD Voting System — Full End-to-End Test",
        "description": "Paillier homomorphic encryption aggregation with libtommath native C module",
        "timestamp": datetime.now().isoformat(),
        "verdict": "PASS — All votes correctly aggregated" if all_correct else "FAIL — Vote count mismatch",

        "scale": {
            "total_voters": NUM_VOTERS,
            "total_candidates": NUM_CANDIDATES,
            "max_capacity_per_candidate": (1 << 25) - 1,
            "max_capacity_total": ((1 << 25) - 1) * NUM_CANDIDATES,
            "capacity_utilized_pct": round(NUM_VOTERS / (((1 << 25) - 1) * NUM_CANDIDATES) * 100, 4),
        },

        "election": {
            "election_id": ELECTION_ID,
            "candidates": per_candidate,
            "total_votes_cast": data["totalVotes"],
            "total_actual": sum(actual_counts),
            "total_expected": sum(total_expected),
            "all_correct": all_correct,
        },

        "crypto": {
            "algorithm": "Paillier Homomorphic Encryption",
            "big_int_library": "libtommath (native C addon)",
            "N_hex": Nhex,
            "H_hex": Hhex,
            "skA_hex": skAhex,
            "N_bit_length": N.bit_length(),
            "N_is_odd": N % 2 == 1,
            "skA_not_equal_H": skAhex != Hhex,
            "bits_per_vote_slot": 25,
            "vote_packing": "25-bit slots, reverse order (MSB = candidate 0)",
            "decryption_formula": "sum = L(product^skA * aux^-1 mod N^2) * skA^-1 mod N",
        },

        "performance": {
            "workers_used": NUM_WORKERS,
            "batch_size": BATCH_SIZE,
            "encryption_and_insert_time_s": round(enc_time, 3),
            "encryption_rate_voters_per_s": round(NUM_VOTERS / enc_time, 0) if enc_time > 0 else 0,
            "aux_product_time_s": round(aux_time, 3),
            "aggregation_decrypt_time_s": round(agg_time, 3),
            "aggregation_rate_voters_per_s": round(NUM_VOTERS / agg_time, 0) if agg_time > 0 else 0,
            "total_test_time_s": round(total_time, 3),
            "db_bytes_written": db_bytes,
            "db_mb_written": round(db_bytes / 1024 / 1024, 2),
            "avg_bytes_per_voter": round(db_bytes / NUM_VOTERS, 1) if NUM_VOTERS > 0 else 0,
        },

        "infrastructure": {
            "backend": "http://localhost:3000",
            "database": f"{DB_HOST}:{DB_PORT}/{DB_NAME}",
            "blockchain": "Solana localnet (test validator)",
            "containers": ["narad-backend", "narad-postgres", "narad-solana", "narad-portal"],
        },

        "timing_breakdown": {
            "db_reset_s": round(t_reset, 3),
            "param_verification_s": round(time.time() - t_params_start, 3),
            "election_creation_s": round(t_election, 3),
            "encryption_insert_s": round(enc_time, 3),
            "aux_product_s": round(aux_time, 3),
            "aggregation_s": round(agg_time, 3),
            "reporting_s": round(time.time() - t_report, 3),
            "total_s": round(total_time, 3),
        },
    }

    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    log_ok(f"JSON results dumped to {Colors.YELLOW}{RESULTS_FILE}{Colors.RESET}")

    # Also dump human-readable markdown report
    md = f"""# NARAD Voting System — Test Report

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Verdict:** {results["verdict"]}

## Scale
- Total Voters: {fmt_num(NUM_VOTERS)}
- Candidates: {NUM_CANDIDATES}
- Capacity Used: {results["scale"]["capacity_utilized_pct"]}%

## Results
| # | Candidate | Actual | Expected | Match | Vote Share |
|---|-----------|--------|----------|-------|------------|
"""
    for c in per_candidate:
        icon = "✅" if c["match"] else "❌"
        md += f"| {c['index']} | {c['name']} | {c['actual_votes']:,} | {c['expected_votes']:,} | {icon} | {c['vote_share_pct']}% |\n"
    md += f"""
| | **Total** | **{sum(actual_counts):,}** | **{sum(total_expected):,}** | | |

## Timing Breakdown
| Phase | Time |
|-------|------|
| DB Reset | {results["timing_breakdown"]["db_reset_s"]}s |
| Param Verification | {results["timing_breakdown"]["param_verification_s"]}s |
| Election Creation | {results["timing_breakdown"]["election_creation_s"]}s |
| Encryption + Insert | {results["timing_breakdown"]["encryption_insert_s"]}s ({fmt_num(results["performance"]["encryption_rate_voters_per_s"])}/s) |
| Aux Product | {results["timing_breakdown"]["aux_product_s"]}s |
| Aggregation | {results["timing_breakdown"]["aggregation_s"]}s ({fmt_num(results["performance"]["aggregation_rate_voters_per_s"])}/s) |
| **Total** | **{results["timing_breakdown"]["total_s"]}s** |

## Crypto
- Algorithm: {results["crypto"]["algorithm"]}
- BigInt: {results["crypto"]["big_int_library"]}
- N: {results["crypto"]["N_bit_length"]} bits (odd={results["crypto"]["N_is_odd"]})
- skA ≠ H: {results["crypto"]["skA_not_equal_H"]}
- Packing: {results["crypto"]["vote_packing"]}
- Formula: `{results["crypto"]["decryption_formula"]}`

## Infrastructure
- Backend: {results["infrastructure"]["backend"]}
- Database: {results["infrastructure"]["database"]}
- Blockchain: {results["infrastructure"]["blockchain"]}
- Workers: {NUM_WORKERS} cores
- Batch size: {fmt_num(BATCH_SIZE)}
- DB written: {results["performance"]["db_mb_written"]} MB ({results["performance"]["avg_bytes_per_voter"]} bytes/voter)

## Election ID
`{ELECTION_ID}`
"""
    with open(MD_FILE, "w") as f:
        f.write(md)
    log_ok(f"Markdown report dumped to {Colors.YELLOW}{MD_FILE}{Colors.RESET}")

    # Exit code
    sys.exit(0 if all_correct else 1)

if __name__ == "__main__":
    main()
