import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import type { WalletTxFns } from "./signing";

const STORAGE_KEY = "matchmind-smart-wallet-v1";
const UNLOCK_SESSION_KEY = "matchmind-smart-wallet-unlock";

type StoredSmartWallet = {
  pubkey: string;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
};

let unlocked: Keypair | null = null;

function b64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function b64Decode(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveAesKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 140_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function hasSmartWallet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function getSmartWalletPubkey(): string | null {
  const stored = readStored();
  return stored?.pubkey ?? null;
}

function readStored(): StoredSmartWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSmartWallet;
  } catch {
    return null;
  }
}

function writeStored(wallet: StoredSmartWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function isSmartWalletUnlocked(): boolean {
  return Boolean(unlocked);
}

export function getUnlockedSmartWalletPubkey(): string | null {
  return unlocked?.publicKey.toBase58() ?? null;
}

export function lockSmartWallet(): void {
  unlocked = null;
  try {
    sessionStorage.removeItem(UNLOCK_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function encryptSecret(secretKey: Uint8Array, pin: string): Promise<Omit<StoredSmartWallet, "pubkey" | "createdAt">> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(pin, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    secretKey as BufferSource,
  );
  return {
    salt: b64Encode(salt),
    iv: b64Encode(iv),
    ciphertext: b64Encode(new Uint8Array(ciphertext)),
  };
}

async function decryptSecret(stored: StoredSmartWallet, pin: string): Promise<Uint8Array> {
  const salt = b64Decode(stored.salt);
  const iv = b64Decode(stored.iv);
  const ciphertext = b64Decode(stored.ciphertext);
  const key = await deriveAesKey(pin, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new Uint8Array(plain);
}

export async function createSmartWallet(pin: string): Promise<{
  pubkey: string;
  secretBase58: string;
}> {
  if (pin.length < 6) throw new Error("PIN must be at least 6 digits");
  const keypair = Keypair.generate();
  const sealed = await encryptSecret(keypair.secretKey, pin);
  writeStored({
    pubkey: keypair.publicKey.toBase58(),
    createdAt: new Date().toISOString(),
    ...sealed,
  });
  unlocked = keypair;
  try {
    sessionStorage.setItem(UNLOCK_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  return {
    pubkey: keypair.publicKey.toBase58(),
    secretBase58: bs58.encode(keypair.secretKey),
  };
}

export async function unlockSmartWallet(pin: string): Promise<string> {
  const stored = readStored();
  if (!stored) throw new Error("No smart wallet on this device");
  try {
    const secret = await decryptSecret(stored, pin);
    unlocked = Keypair.fromSecretKey(secret);
  } catch {
    throw new Error("Wrong PIN — try again");
  }
  if (unlocked.publicKey.toBase58() !== stored.pubkey) {
    unlocked = null;
    throw new Error("Wallet data corrupted — create a new smart wallet");
  }
  try {
    sessionStorage.setItem(UNLOCK_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  return unlocked.publicKey.toBase58();
}

export function clearSmartWallet(): void {
  lockSmartWallet();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function signSmartWalletMessage(message: Uint8Array): Uint8Array {
  if (!unlocked) throw new Error("Unlock your smart wallet first");
  return nacl.sign.detached(message, unlocked.secretKey);
}

export function smartWalletTxFns(): WalletTxFns {
  if (!unlocked) throw new Error("Unlock your smart wallet first");
  const keypair = unlocked;
  return {
    signTransaction: async (tx) => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
        return tx;
      }
      tx.partialSign(keypair);
      return tx;
    },
    sendTransaction: async (tx, connection) => {
      if (tx instanceof Transaction) {
        const alreadySigned = tx.signatures.some((entry) => entry.signature != null);
        if (!alreadySigned) {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.lastValidBlockHeight = lastValidBlockHeight;
        }
        tx.partialSign(keypair);
        const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
        const latest = await connection.getLatestBlockhash("confirmed");
        await connection.confirmTransaction(
          { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
          "confirmed",
        );
        return signature;
      }
      tx.sign([keypair]);
      const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        "confirmed",
      );
      return signature;
    },
  };
}

export function exportUnlockedSecretBase58(): string | null {
  if (!unlocked) return null;
  return bs58.encode(unlocked.secretKey);
}
