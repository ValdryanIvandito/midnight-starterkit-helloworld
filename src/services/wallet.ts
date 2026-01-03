// src/services/wallet.ts

// External Libraries
import crypto from "node:crypto";
import { firstValueFrom } from "rxjs";

// Midnight Libraries
import type { Wallet, WalletState } from "@midnight-ntwrk/wallet-api";
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import {
  getLedgerNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";

/**
 * Context wallet runtime
 */
export interface WalletContext {
  wallet: Wallet;
  state: WalletState;
}

/**
 * Konfigurasi minimal network untuk wallet
 */
export interface WalletNetworkConfig {
  indexer: string;
  indexerWS: string;
  proofServer: string;
  node: string;
  zSwapNetworkId: number;
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * Adapter wallet agar kompatibel dengan midnight-js-contracts
 */
export function setWalletProvider(
  wallet: Wallet,
  state: { coinPublicKey: string; encryptionPublicKey: string }
) {
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,

    // Proses balancing → proving → serialize ulang
    balanceTx(tx: any, newCoins: any) {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(
            tx.serialize(getLedgerNetworkId()),
            getZswapNetworkId()
          ),
          newCoins
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) =>
          Transaction.deserialize(
            zswapTx.serialize(getZswapNetworkId()),
            getLedgerNetworkId()
          )
        )
        .then(createBalancedTx);
    },

    // Submit transaction ke node
    submitTx(tx: any) {
      return wallet.submitTransaction(tx);
    },
  };
}

/**
 * Build wallet dari seed yang sudah ada
 */
export async function buildWallet(
  config: WalletNetworkConfig,
  seed: string
): Promise<WalletContext> {
  if (!seed) {
    throw new Error("Wallet seed is required");
  }

  const wallet = await WalletBuilder.build(
    config.indexer,
    config.indexerWS,
    config.proofServer,
    config.node,
    seed,
    config.zSwapNetworkId,
    config.logLevel ?? "info"
  );

  wallet.start();

  // Ambil state awal wallet
  const state = await firstValueFrom(wallet.state());

  return { wallet, state };
}

/**
 * Generate seed baru + build wallet
 */
export async function getNewWallet(
  config: WalletNetworkConfig
): Promise<WalletContext & { seed: string }> {
  const seed = crypto.randomBytes(32).toString("hex");
  const ctx = await buildWallet(config, seed);

  return {
    ...ctx,
    seed,
  };
}
