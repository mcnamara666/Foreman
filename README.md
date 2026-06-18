```
================================================================
 WORK ORDER — FOREMAN
 On-chain proof-of-work log · signed off and paid by a machine
================================================================
 SITE:   foreman-arc.vercel.app
 NETWORK: ARC Testnet  (chain 5042002, native unit USDC)
```

A logbook for tradespeople. You finish a job, you log it — before
photo, after photo, what the trade was, where it was. That entry
goes on the chain with a timestamp and stays there; nobody can
quietly edit it later. Then the Foreman — a software crew boss
with its own funded wallet — reads the board, signs the job off,
and pays you a USDC bounty out of that wallet. No invoice, no
office, no waiting on a person to approve the chit.

----------------------------------------------------------------
THE JOB
----------------------------------------------------------------

A builder files an entry by calling:

    logJob(beforeUri, afterUri, title, kind, location, isPrivate)

  - beforeUri / afterUri — image links (uploaded via /api/upload
    to blob storage, or paste your own URL). Max 400 chars each,
    both required.
  - title    — what you did. "Re-tiled the bathroom." Required.
  - kind     — the trade. "Tiling", "Plumbing", "Roofing." ≤40.
  - location — free text. "Paris 11e." Optional, ≤80.
  - isPrivate — keep it off the public board. ADVISORY ONLY: the
    site unlists it, but the row is still written on-chain and
    readable by anyone who looks. It is not encrypted. Real
    shielding would use Arc's opt-in privacy; this is just a UI
    courtesy, and the contract comments say so plainly.

Logging is free apart from the gas, and the gas is paid in USDC.
The entry is now a dated, tamper-evident record that you did the
work — useful whether or not it ever gets signed off.

----------------------------------------------------------------
SIGN-OFF & PAY
----------------------------------------------------------------

The Foreman is a real autonomous server process — a Node route at
/api/agent/run that loads its own private key (AGENT_PRIVATE_KEY),
holds its own wallet, and acts without a human pressing send.

What it does on a run:

  1. Pulls the latest entries off the board (latest(24)).
  2. Filters to the ones not yet verified, oldest first, takes
     up to 4 per run.
  3. For each, it dry-runs signOff(id) to confirm the job is
     still open and the payment will land.
  4. It checks its own balance covers bounty + gas headroom. If
     it's short, it stops and reports "needs funds" instead of
     half-paying.
  5. It calls, on-chain, from its own wallet:

         signOff(id) payable   // bounty rides along as msg.value

The contract marks the job verified, stamps signedBy with the
agent's address, records the bounty, and forwards the money to
the builder in the same transaction. Default bounty is 0.05 USDC
per job (set by AGENT_BOUNTY). Runs are serialized with a short
cooldown so a double-tap or the auto-trigger after a new log
can't race the wallet's nonce.

A run fires automatically right after a job is logged, and the
"Wake the Foreman" button on the site triggers one on demand.
If no key is configured, /api/agent/info reports it as not live
and the contract simply waits — anyone could call signOff, but
the agent is the intended caller.

----------------------------------------------------------------
WHO PAYS WHOM
----------------------------------------------------------------

  BUILDER  -> chain      logJob(...)      pays gas in USDC
  FOREMAN  -> BUILDER    signOff(id)      pays 0.05 USDC bounty
  VISITOR  -> BUILDER    endorse(id)      pays 0.1 USDC, a vouch

endorse(id) is a small payable tip from a visitor straight to the
builder — you can't endorse your own job, and it must carry
value. Every dollar in, by either route, is added to the
builder's lifetime earned() tally. The contract takes no cut;
bounties and endorsements pass through to the builder's address
inside the same call that triggers them.

----------------------------------------------------------------
WHY THIS ONLY MAKES SENSE ON ARC
----------------------------------------------------------------

The whole point here is a machine paying a person the second it
approves the work. That only holds together if the thing the
agent burns to transact and the thing it hands the builder are
the same unit of account.

On a normal chain the Foreman would need a stash of some volatile
gas token just to be allowed to move, plus a separate balance of
the actual payout currency, plus a human or a swap in the loop to
keep the gas tank full. The moment you need someone to refill a
gas token so the robot can keep paying, you no longer have an
autonomous crew boss — you have a person babysitting a script.

Arc settles in USDC natively. The Foreman funds one wallet in
dollars, and that one balance covers both the cost of signing off
and the bounty it pays out. A 0.05 bounty plus a fraction-of-a-
cent fee is one debit from one pool, finalised in well under a
second, with no second asset to acquire and nobody to approve it.
That is the only setting in which "log the job, get paid by a
machine before you've packed the drill away" is a real workflow
and not a demo with a human quietly topping up the meter.

----------------------------------------------------------------
JOB DETAILS
----------------------------------------------------------------

  CONTRACT  0x9aFb21905f694eb4133B96c3e5714C3f5085b165
  CHAIN     5042002  (ARC Testnet)
  SETTLE    native USDC, paid inside the sign-off / endorse call
  RECORD    https://testnet.arcscan.app/address/0x9aFb21905f694eb4133B96c3e5714C3f5085b165

One deployed contract, the single source of truth. Reads:
jobCount, verifiedCount, bountiesPaid, endorsedTotal, earned,
getJob, jobsOf, latest. Events: Logged, SignedOff, Endorsed.

----------------------------------------------------------------
RUN THE SITE
----------------------------------------------------------------

  npm install
  npm run dev        # http://localhost:3000

To put the Foreman on the clock, set environment variables:

  AGENT_PRIVATE_KEY  the agent's funded wallet (keep it secret)
  AGENT_BOUNTY       payout per job, in USDC  (default 0.05)
  BLOB_READ_WRITE_TOKEN  for photo uploads via /api/upload

Fund that wallet with testnet USDC so it has something to pay.
Built with Next.js, ethers v6, and a single Solidity contract.

----------------------------------------------------------------
 Filed by Andy McNamara · github.com/mcnamara666
----------------------------------------------------------------
