// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Foreman — an on-chain work log for tradespeople, signed off and paid by an autonomous agent
/// @notice A builder logs a finished job (before/after photos + details). The job is a timestamped,
///         tamper-proof proof-of-work. An autonomous "Foreman" agent watches for new jobs and calls
///         signOff(), paying the builder a USDC bounty straight from its own wallet — a machine-to-person
///         payment with no human in the loop. Visitors can endorse a job by sending the builder USDC.
///         Built for ARC: USDC is the native gas, settlement is instant, and the agent transacts on its
///         own. A job can be flagged private — an advisory hint the app honours by unlisting it from
///         the public board; the record itself is still on-chain (true shielding would use Arc's native
///         opt-in privacy).
contract Foreman {
    struct Job {
        uint256 id;
        address builder;
        string beforeUri;
        string afterUri;
        string title;
        string kind;      // trade / category, e.g. "Tiling"
        string location;  // free-text, e.g. "Paris 11e"
        uint64 loggedAt;
        bool isPrivate;   // advisory: the app unlists it from the public board (data is still on-chain)
        bool verified;    // signed off by the agent
        uint64 verifiedAt;
        address signedBy; // the agent (or whoever) that signed off
        uint256 bounty;       // USDC the agent paid on sign-off
        uint256 endorsedTotal; // USDC endorsements received
        uint32 endorsements;   // number of endorsements
    }

    uint256 public jobCount;
    uint256 public verifiedCount;
    uint256 public bountiesPaid;   // total USDC paid out by sign-offs
    uint256 public endorsedTotal;  // total USDC sent via endorsements

    mapping(uint256 => Job) public jobs;
    mapping(address => uint256[]) private _byBuilder;
    mapping(address => uint256) public earned; // lifetime USDC to a builder (bounties + endorsements)

    event Logged(uint256 indexed id, address indexed builder, string title, string kind, bool isPrivate);
    event SignedOff(uint256 indexed id, address indexed builder, address indexed agent, uint256 bounty);
    event Endorsed(uint256 indexed id, address indexed builder, address indexed from, uint256 amount);

    /// @notice Log a finished job. Free to call — the only cost is the (USDC) gas.
    function logJob(
        string calldata beforeUri,
        string calldata afterUri,
        string calldata title,
        string calldata kind,
        string calldata location,
        bool isPrivate
    ) external returns (uint256) {
        require(bytes(beforeUri).length > 0 && bytes(beforeUri).length <= 400, "bad before");
        require(bytes(afterUri).length > 0 && bytes(afterUri).length <= 400, "bad after");
        require(bytes(title).length > 0 && bytes(title).length <= 120, "bad title");
        require(bytes(kind).length <= 40, "bad kind");
        require(bytes(location).length <= 80, "bad location");

        uint256 id = ++jobCount;
        Job storage j = jobs[id];
        j.id = id;
        j.builder = msg.sender;
        j.beforeUri = beforeUri;
        j.afterUri = afterUri;
        j.title = title;
        j.kind = kind;
        j.location = location;
        j.loggedAt = uint64(block.timestamp);
        j.isPrivate = isPrivate;

        _byBuilder[msg.sender].push(id);
        emit Logged(id, msg.sender, title, kind, isPrivate);
        return id;
    }

    /// @notice Sign off a job and pay the builder a USDC bounty (sent with the call). Open so the
    ///         Foreman agent — or anyone — can settle it; the agent is the intended caller.
    function signOff(uint256 id) external payable {
        Job storage j = jobs[id];
        require(j.builder != address(0), "no job");
        require(!j.verified, "already signed off");

        // effects
        j.verified = true;
        j.verifiedAt = uint64(block.timestamp);
        j.signedBy = msg.sender;
        j.bounty = msg.value;
        verifiedCount += 1;
        bountiesPaid += msg.value;
        earned[j.builder] += msg.value;

        // interaction — the bounty lands with the builder instantly
        if (msg.value > 0) {
            (bool ok, ) = payable(j.builder).call{value: msg.value}("");
            require(ok, "bounty failed");
        }
        emit SignedOff(id, j.builder, msg.sender, msg.value);
    }

    /// @notice Endorse a job by sending the builder USDC (a vouch / micro-payment).
    function endorse(uint256 id) external payable {
        Job storage j = jobs[id];
        require(j.builder != address(0), "no job");
        require(j.builder != msg.sender, "your own job");
        require(msg.value > 0, "send something");

        j.endorsements += 1;
        j.endorsedTotal += msg.value;
        endorsedTotal += msg.value;
        earned[j.builder] += msg.value;

        (bool ok, ) = payable(j.builder).call{value: msg.value}("");
        require(ok, "endorse failed");
        emit Endorsed(id, j.builder, msg.sender, msg.value);
    }

    // ── views ──────────────────────────────────────────────
    function getJob(uint256 id) external view returns (Job memory) {
        return jobs[id];
    }

    function jobsOf(address a) external view returns (uint256[] memory) {
        return _byBuilder[a];
    }

    /// @notice Ids of the latest `n` jobs (newest first). Returns every job; the app unlists the ones
    ///         flagged private.
    function latest(uint256 n) external view returns (uint256[] memory out) {
        uint256 count = jobCount;
        if (n > count) n = count;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = count - i;
    }
}
