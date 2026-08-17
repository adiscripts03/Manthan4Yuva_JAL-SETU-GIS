import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────
// Config — read once at startup. If any of these are missing,
// the blockchain features quietly disable themselves instead
// of crashing the whole backend (see isEnabled() below).
// ─────────────────────────────────────────────────────────

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || '';
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '';
const EXPLORER_BASE_URL = process.env.BLOCKCHAIN_EXPLORER_URL || 'https://amoy.polygonscan.com';

// Adjust this relative path to wherever ProofLedger.abi.json actually lives
// relative to this compiled file's output location (dist/services/blockchain.js).
const abiPath = path.resolve(__dirname, '../../blockchain/ProofLedger.abi.json');
const CONTRACT_ABI = JSON.parse(readFileSync(abiPath, 'utf8'));

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let contract: ethers.Contract | null = null;

function init() {
  if (contract) return; // already initialized
  if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) return;

  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
}

init();

/** Whether blockchain features are configured and ready to use. */
export function isEnabled(): boolean {
  return contract !== null;
}

/**
 * Deterministically hash a record's meaningful fields.
 * We deliberately hash a *stable subset* of fields (not the raw DB
 * document, which includes mutable bookkeeping like status/_id) so the
 * hash represents "the facts of the report as submitted," not fields
 * that legitimately change later (e.g. status: pending -> resolved).
 *
 * IMPORTANT: this exact same function must be used both when writing
 * the proof and when later verifying it, or hashes will never match.
 */
export function hashRecord(fields: Record<string, unknown>): string {
  const stable = Object.keys(fields)
    .sort()
    .reduce((acc, key) => {
      acc[key] = fields[key];
      return acc;
    }, {} as Record<string, unknown>);
  const json = JSON.stringify(stable);
  const hash = createHash('sha256').update(json).digest('hex');
  return '0x' + hash;
}

export interface RecordProofResult {
  success: boolean;
  txHash?: string;
  dataHash?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Write a proof (hash) of a record to the smart contract.
 * recordType: a short label like "citizen_report" | "intervention"
 * recordId: the record's database id as a string
 * fields: the stable data to hash (see hashRecord)
 */
export async function recordProof(
  recordType: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<RecordProofResult> {
  if (!isEnabled() || !contract) {
    return { success: false, error: 'Blockchain not configured (missing env vars)' };
  }

  try {
    const dataHash = hashRecord(fields);
    const tx = await contract.recordProof(recordId, recordType, dataHash);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      dataHash,
      explorerUrl: `${EXPLORER_BASE_URL}/tx/${receipt.hash}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface VerifyResult {
  onChain: boolean;
  matches?: boolean;
  onChainHash?: string;
  recomputedHash?: string;
  submittedBy?: string;
  timestamp?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Re-hash the current record data and compare it to what's on-chain.
 * This is what powers the "Verify" button on the Civic Proof Ledger page.
 */
export async function verifyProof(
  recordId: string,
  currentFields: Record<string, unknown>
): Promise<VerifyResult> {
  if (!isEnabled() || !contract) {
    return { onChain: false, error: 'Blockchain not configured (missing env vars)' };
  }

  try {
    const exists = await contract.proofExists(recordId);
    if (!exists) {
      return { onChain: false, error: 'No proof found on-chain for this record' };
    }

    const [onChainHash, , submittedBy, timestamp] = await contract.getProof(recordId);
    const recomputedHash = hashRecord(currentFields);

    return {
      onChain: true,
      matches: onChainHash.toLowerCase() === recomputedHash.toLowerCase(),
      onChainHash,
      recomputedHash,
      submittedBy,
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      explorerUrl: `${EXPLORER_BASE_URL}/address/${CONTRACT_ADDRESS}`,
    };
  } catch (err) {
    return {
      onChain: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Total number of proofs recorded on-chain — for the ledger's summary counter. */
export async function getTotalProofs(): Promise<number | null> {
  if (!isEnabled() || !contract) return null;
  try {
    const total = await contract.totalProofs();
    return Number(total);
  } catch {
    return null;
  }
}

export function getExplorerBaseUrl(): string {
  return EXPLORER_BASE_URL;
}

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}
