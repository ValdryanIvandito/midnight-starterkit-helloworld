import * as readline from "readline/promises";
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
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
import { Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { WebSocket } from "ws";
import * as path from "path";
import * as fs from "fs";
import * as Rx from "rxjs";

const message = "Hello World !";

// @ts-ignore
globalThis.WebSocket = WebSocket;

// Sesuaikan dengan network yang sama seperti deploy
setNetworkId(NetworkId.Undeployed);

const UNDEPLOYED_CONFIG = {
  indexer: "http://127.0.0.1:8088/api/v1/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v1/graphql/ws",
  node: "http://127.0.0.1:9944",
  proofServer: "http://127.0.0.1:6300",
};

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Call storeMessage function...\n");

  // 1. Baca contractAddress dari deployment.json
  if (!fs.existsSync("deployment.json")) {
    console.error("deployment.json not found. Run npm run deploy first.");
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  const contractAddress: string =
    deployment.contractAddress || deployment.address;
  console.log(`Contract: ${contractAddress}\n`);

  // 2. Minta wallet seed (harus sama dengan saat deploy, kalau mau pakai wallet yang sama)
  const walletSeed = await rl.question("Enter your wallet seed: ");

  console.log("\nConnecting to Midnight network...");

  // 3. Build & sync wallet
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

  await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s) => s.syncProgress?.synced === true))
  );

  // 4. Load modul kontrak
  const contractPath = path.join(process.cwd(), "contracts");
  const contractModulePath = path.join(
    contractPath,
    "managed",
    "hello-world",
    "contract",
    "index.cjs"
  );
  const HelloWorldModule = await import(contractModulePath);
  const contractInstance = new HelloWorldModule.Contract({});

  // 5. Wallet provider (sama pola dengan deploy)
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

  // 6. Providers & findDeployedContract [[Interact CLI](https://docs.midnight.network/getting-started/interact-with-mn-app#create-the-cli-script)]
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
    walletProvider,
    midnightProvider: walletProvider,
  };

  const deployed: any = await findDeployedContract(providers, {
    contractAddress,
    contract: contractInstance,
    privateStateId: "helloWorldState",
    initialPrivateState: {},
  });

  // 7. Panggil storeMessage("Hello World")
  try {
    console.log("Calling storeMessage function...");
    const tx = await deployed.callTx.storeMessage(message);
    console.log("Success!");
    console.log(`Message: ${message}`);
    console.log(`Transaction ID: ${tx.public.txId}`);
    console.log(`Block height: ${tx.public.blockHeight}\n`);
  } catch (error) {
    console.error("Failed to store message:", error);
  }

  await wallet.close();
  rl.close();
}

main().catch(console.error);
