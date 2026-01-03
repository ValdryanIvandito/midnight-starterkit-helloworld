// src/services/provider.ts

// Midnight Libraries
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import type { BalancedTransaction } from "@midnight-ntwrk/midnight-js-types";

export interface MidnightNetworkConfig {
  indexer: string;
  indexerWS: string;
  proofServer: string;
}

export interface MidnightWalletProvider {
  coinPublicKey: string;
  encryptionPublicKey: string;
  balanceTx: (tx: unknown, newCoins: unknown) => Promise<BalancedTransaction>;
  submitTx: (tx: unknown) => Promise<string>;
}

/**
 * Setup seluruh provider yang dibutuhkan untuk deploy dan berinteraksi dengan kontrak
 */
export async function setProviders(
  privateStateStoreName: string,
  config: MidnightNetworkConfig,
  zkConfigPath: string,
  walletProvider: MidnightWalletProvider
) {
  return {
    // Penyimpanan private state kontrak
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName,
    }),

    // Public data dari indexer
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS
    ),

    // Konfigurasi ZK (hasil compile compact)
    zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),

    // Proof server
    proofProvider: httpClientProofProvider(config.proofServer),

    // Wallet provider
    walletProvider,

    // Alias untuk kompatibilitas API
    midnightProvider: walletProvider,
  };
}
