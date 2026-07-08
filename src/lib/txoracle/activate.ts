import axios from "axios";
import nacl from "tweetnacl";

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { getTxoracleApiBaseUrl, getTxoracleConfig } from "./config";

export async function startGuestSession(apiOrigin = getTxoracleConfig().apiOrigin): Promise<string> {
  const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
  return authResponse.data.token as string;
}

export async function signActivationMessage(
  message: Uint8Array,
  wallet: Pick<WalletContextState, "signMessage">,
  payerSecretKey?: Uint8Array,
): Promise<Uint8Array> {
  if (wallet.signMessage) {
    return wallet.signMessage(message);
  }

  if (payerSecretKey) {
    return nacl.sign.detached(message, payerSecretKey);
  }

  throw new Error("Wallet must support signMessage, or provide a local payer secret key.");
}

export async function activateApiToken(params: {
  txSig: string;
  selectedLeagues?: number[];
  jwt?: string;
  wallet: Pick<WalletContextState, "signMessage">;
  payerSecretKey?: Uint8Array;
}): Promise<string> {
  const { apiOrigin } = getTxoracleConfig();
  const apiBaseUrl = getTxoracleApiBaseUrl();
  const selectedLeagues = params.selectedLeagues ?? [];
  const jwt = params.jwt ?? (await startGuestSession(apiOrigin));

  const messageString = `${params.txSig}:${selectedLeagues.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = await signActivationMessage(message, params.wallet, params.payerSecretKey);
  const walletSignature = bytesToBase64(signatureBytes);

  const activationResponse = await axios.post(
    `${apiBaseUrl}/token/activate`,
    {
      txSig: params.txSig,
      walletSignature,
      leagues: selectedLeagues,
    },
    { headers: { Authorization: `Bearer ${jwt}` } },
  );

  return (activationResponse.data.token ?? activationResponse.data) as string;
}
