// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ProofLedger
 * ------------
 * A minimal, purpose-built contract for a Civic Proof Ledger.
 *
 * It does NOT store full report data (that stays in the database —
 * cheaper, flexible, and can include photos etc). It only stores a
 * fingerprint (hash) of each record, so anyone can later prove a
 * record has (or hasn't) been tampered with by re-hashing it and
 * comparing.
 *
 * Design choices, explained for someone new to Solidity:
 * - "recordType" lets us reuse one contract for multiple record kinds
 *   (e.g. "citizen_report", "intervention").
 * - We store the database's own record ID as the "recordId" string,
 *   so on-chain data can always be linked back to the full record.
 * - We never allow updating or deleting an entry — that's what makes
 *   this a genuine immutable ledger, not just a fancy database table.
 * - Only the contract owner (the backend's system wallet) can write.
 *   Anyone in the world can read/verify for free — that's the
 *   "public, transparent" part.
 */
contract ProofLedger {
    struct Proof {
        bytes32 dataHash;      // sha256 hash of the record's stable fields
        string recordType;     // e.g. "citizen_report" | "intervention"
        string recordId;       // database record id, for linking back
        address submittedBy;   // wallet that wrote this entry (the backend)
        uint256 timestamp;     // block timestamp when written
    }

    address public owner;

    // recordId => Proof
    mapping(string => Proof) private proofs;

    // Keep an ordered list of all recordIds so the ledger can be enumerated
    string[] private recordIds;

    event ProofRecorded(
        string indexed recordId,
        string recordType,
        bytes32 dataHash,
        address submittedBy,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ProofLedger: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Record a new proof. Reverts if this recordId was already used —
     * a proof, once written, can never be overwritten.
     */
    function recordProof(
        string calldata recordId,
        string calldata recordType,
        bytes32 dataHash
    ) external onlyOwner {
        require(bytes(recordId).length > 0, "ProofLedger: empty recordId");
        require(proofs[recordId].timestamp == 0, "ProofLedger: recordId already exists");

        proofs[recordId] = Proof({
            dataHash: dataHash,
            recordType: recordType,
            recordId: recordId,
            submittedBy: msg.sender,
            timestamp: block.timestamp
        });

        recordIds.push(recordId);

        emit ProofRecorded(recordId, recordType, dataHash, msg.sender, block.timestamp);
    }

    /**
     * Look up a single proof by recordId. Free to call — no gas needed
     * for reads (this is a `view` function).
     */
    function getProof(string calldata recordId)
        external
        view
        returns (
            bytes32 dataHash,
            string memory recordType,
            address submittedBy,
            uint256 timestamp
        )
    {
        Proof memory p = proofs[recordId];
        require(p.timestamp != 0, "ProofLedger: no proof for this recordId");
        return (p.dataHash, p.recordType, p.submittedBy, p.timestamp);
    }

    /// Returns true if a recordId has been written to the ledger.
    function proofExists(string calldata recordId) external view returns (bool) {
        return proofs[recordId].timestamp != 0;
    }

    /// Total number of proofs recorded — handy for a "N records on-chain" counter.
    function totalProofs() external view returns (uint256) {
        return recordIds.length;
    }

    /// Returns the recordId at a given index, for paginated enumeration.
    function recordIdAt(uint256 index) external view returns (string memory) {
        require(index < recordIds.length, "ProofLedger: index out of range");
        return recordIds[index];
    }
}
