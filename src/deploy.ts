import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  NetworkId,
  setNetworkId,
  getZswapNetworkId,
  getLedgerNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { nativeToken, Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as Rx from "rxjs";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import dotenv from "dotenv";
dotenv.config();

const walletSeed: string = process.env.WALLET_SEED || "";

if (!walletSeed) {
  console.log("walletSeed doesn't exist, please put walletSeed in .env");
}

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Undeployed
setNetworkId(NetworkId.Undeployed);

// Local Midnight Network (Docker)
const UNDEPLOYED_CONFIG = {
  indexer: "http://127.0.0.1:8088/api/v1/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v1/graphql/ws",
  node: "http://127.0.0.1:9944",
  proofServer: "http://127.0.0.1:6300",
};

const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        if (state.syncProgress) {
          console.log(
            `Sync progress: synced=${state.syncProgress.synced}, sourceGap=${state.syncProgress.lag.sourceGap}, applyGap=${state.syncProgress.lag.applyGap}`
          );
        }
      }),
      Rx.filter((state) => state.syncProgress?.synced === true),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
      Rx.tap((balance) => console.log(`Wallet funded with balance: ${balance}`))
    )
  );

async function main() {
  console.log("Midnight Hello World Deployment\n");

  try {
    // Build wallet from seed
    console.log("Building wallet...");
    const wallet = await WalletBuilder.buildFromSeed(
      UNDEPLOYED_CONFIG.indexer,
      UNDEPLOYED_CONFIG.indexerWS,
      UNDEPLOYED_CONFIG.proofServer,
      UNDEPLOYED_CONFIG.node,
      walletSeed,
      getZswapNetworkId(),
      "info"
    );

    wallet.start();
    const state = await Rx.firstValueFrom(wallet.state());

    console.log(`Your wallet address is: ${state.address}`);

    let balance = state.balances[nativeToken()] || 0n;

    if (balance === 0n) {
      console.log(`Your wallet balance is: 0`);
      console.log(`Please get some funds, Waiting to receive tokens...`);
      balance = await waitForFunds(wallet);
    }

    console.log(`Balance: ${balance}`);

    // Load compiled contract files
    console.log("Loading contract...");
    const contractPath = path.join(process.cwd(), "contracts");
    const contractModulePath = path.join(
      contractPath,
      "managed",
      "hello-world",
      "contract",
      "index.cjs"
    );

    if (!fs.existsSync(contractModulePath)) {
      console.error("Contract not found! Run: npm run compile");
      process.exit(1);
    }

    const HelloWorldModule = await import(contractModulePath);
    const contractInstance = new HelloWorldModule.Contract({});

    // Create wallet provider for transactions
    const walletState = await Rx.firstValueFrom(wallet.state());

    const walletProvider = {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
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
      submitTx(tx: any) {
        return wallet.submitTransaction(tx);
      },
    };

    // Configure all required providers
    console.log("Setting up providers...");
    const zkConfigPath = path.join(contractPath, "managed", "hello-world");
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "hello-world-state",
      }),
      publicDataProvider: indexerPublicDataProvider(
        UNDEPLOYED_CONFIG.indexer,
        UNDEPLOYED_CONFIG.indexerWS
      ),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(UNDEPLOYED_CONFIG.proofServer),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };

    // Deploy contract to blockchain
    console.log("Deploying contract (30-60 seconds)...");

    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: "helloWorldState",
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    if (contractAddress) {
      // Save deployment information
      console.log("\nYour contract deployment is success!");
      console.log(`Contract: ${contractAddress}\n`);

      const info = {
        contractAddress,
        deployedAt: new Date().toISOString(),
      };

      fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));
      console.log("Saved to deployment.json");

      await wallet.close();
    } else {
      console.log("\nYour contract deployment is failed!");
    }
  } catch (error) {
    console.error("Failed:", error);
  }
}

main().catch(console.error);
