import {
  BaseMessageSignerWalletAdapter,
  scopePollingDetectionStrategy,
  WalletAccountError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletPublicKeyError,
  WalletReadyState,
  WalletSignMessageError,
  WalletSignTransactionError,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { ensureWalletNetwork } from "./ensure-wallet-network";

export const OkxWalletName = "OKX Wallet" as WalletName<"OKX Wallet">;

type OkxSolanaProvider = {
  isConnected: boolean;
  publicKey: { toBytes(): Uint8Array; toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  signTransaction: <T>(transaction: T) => Promise<T>;
  signAllTransactions: <T>(transactions: T[]) => Promise<T[]>;
  on?: (event: "disconnect" | "accountChanged", handler: (...args: unknown[]) => void) => void;
  off?: (event: "disconnect" | "accountChanged", handler: (...args: unknown[]) => void) => void;
};

export function getOkxSolana(): OkxSolanaProvider | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { okxwallet?: { solana?: OkxSolanaProvider } }).okxwallet?.solana ?? null;
}

export class OkxWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = OkxWalletName;
  url = "https://www.okx.com/web3";
  icon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='12' fill='%23000'/%3E%3Ctext x='24' y='30' text-anchor='middle' fill='white' font-size='14' font-family='Arial,sans-serif' font-weight='700'%3EOKX%3C/text%3E%3C/svg%3E";
  supportedTransactionVersions = new Set(["legacy", 0] as const);

  private _connecting = false;
  private _wallet: OkxSolanaProvider | null = null;
  private _publicKey: PublicKey | null = null;
  private _readyState =
    typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.NotDetected;

  constructor() {
    super();
    if (this._readyState === WalletReadyState.Unsupported) return;

    if (getOkxSolana()) {
      this._readyState = WalletReadyState.Installed;
    }

    scopePollingDetectionStrategy(() => {
      if (getOkxSolana()) {
        this._readyState = WalletReadyState.Installed;
        this.emit("readyStateChange", this._readyState);
        return true;
      }
      return false;
    });
  }

  get publicKey() {
    return this._publicKey;
  }

  get connecting() {
    return this._connecting;
  }

  get readyState() {
    return this._readyState;
  }

  private _disconnected = () => {
    const wallet = this._wallet;
    if (!wallet) return;
    wallet.off?.("disconnect", this._disconnected);
    this._wallet = null;
    this._publicKey = null;
    this.emit("error", new WalletDisconnectedError());
    this.emit("disconnect");
  };

  async connect(): Promise<void> {
    if (this.connected || this._connecting) return;
    if (this._readyState !== WalletReadyState.Installed) {
      throw new WalletNotReadyError();
    }

    this._connecting = true;
    try {
      await ensureWalletNetwork(OkxWalletName);
      const wallet = getOkxSolana();
      if (!wallet) throw new WalletNotReadyError();

      if (!wallet.isConnected) {
        try {
          await wallet.connect();
        } catch (error) {
          throw new WalletConnectionError(error instanceof Error ? error.message : "Connection failed", error);
        }
      }

      if (!wallet.publicKey) throw new WalletAccountError();

      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(wallet.publicKey.toBytes());
      } catch (error) {
        throw new WalletPublicKeyError(error instanceof Error ? error.message : "Invalid public key", error);
      }

      wallet.on?.("disconnect", this._disconnected);
      this._wallet = wallet;
      this._publicKey = publicKey;
      this.emit("connect", publicKey);
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet;
    if (!wallet) return;
    wallet.off?.("disconnect", this._disconnected);
    this._wallet = null;
    this._publicKey = null;
    try {
      await wallet.disconnect();
    } catch (error) {
      this.emit("error", new WalletDisconnectionError(error instanceof Error ? error.message : "Disconnect failed", error));
    }
    this.emit("disconnect");
  }

  async signTransaction<T>(transaction: T): Promise<T> {
    const wallet = this._wallet;
    if (!wallet) throw new WalletNotConnectedError();
    try {
      await ensureWalletNetwork(OkxWalletName);
      return await wallet.signTransaction(transaction);
    } catch (error) {
      throw new WalletSignTransactionError(error instanceof Error ? error.message : "Sign failed", error);
    }
  }

  async signAllTransactions<T>(transactions: T[]): Promise<T[]> {
    const wallet = this._wallet;
    if (!wallet) throw new WalletNotConnectedError();
    try {
      await ensureWalletNetwork(OkxWalletName);
      return await wallet.signAllTransactions(transactions);
    } catch (error) {
      throw new WalletSignTransactionError(error instanceof Error ? error.message : "Sign failed", error);
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const wallet = this._wallet;
    if (!wallet) throw new WalletNotConnectedError();
    try {
      const { signature } = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      throw new WalletSignMessageError(error instanceof Error ? error.message : "Sign failed", error);
    }
  }
}
