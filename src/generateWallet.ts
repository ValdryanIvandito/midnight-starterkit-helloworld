import { WalletBuilder } from "@midnight-ntwrk/wallet";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { WebSocket } from "ws";
import * as Rx from "rxjs";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

// Testnet connection endpoints
const TESTNET_CONFIG = {
  indexer: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWS: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  node: "https://rpc.testnet-02.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

async function main() {
  // Generate new wallet seed
  const bytes = new Uint8Array(32);
  // @ts-ignore
  crypto.getRandomValues(bytes);
  const walletSeed = Array.from(bytes, (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

  console.log(`\nSAVE THIS SEED: ${walletSeed}\n`);

  // Rest of deployment logic follows...

  // Build wallet from seed
  console.log("Building wallet...");
  const wallet = await WalletBuilder.buildFromSeed(
    TESTNET_CONFIG.indexer,
    TESTNET_CONFIG.indexerWS,
    TESTNET_CONFIG.proofServer,
    TESTNET_CONFIG.node,
    walletSeed,
    getZswapNetworkId(),
    "info"
  );

  wallet.start();
  const state = await Rx.firstValueFrom(wallet.state());

  console.log(`Your wallet address is: ${state.address}`);

  let balance = state.balances[nativeToken()] || 0n;

  console.log(`Your wallet balance is: ${balance}`);
}

main().catch(console.error);
