// src/indexerQuery.ts
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Undeployed
setNetworkId(NetworkId.Undeployed);

// Local Midnight Network (Docker)
const UNDEPLOYED_CONFIG = {
  indexer: "http://127.0.0.1:8088/api/v1/graphql",
  indexerWS: "ws://127.0.0.1:8088/api/v1/graphql/ws",
};

async function main() {
  console.log("Querying Hello World contract state via local indexer\n");

  // 1. Read contract address from deployment.json
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found. Deploy the contract first.");
  }

  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  const contractAddress: string =
    deployment.address || deployment.contractAddress;

  if (!contractAddress) {
    throw new Error("No contract address found in deployment.json");
  }

  console.log("Contract address:", contractAddress, "\n");

  // 2. Create public data provider (indexer client)
  const provider = indexerPublicDataProvider(
    UNDEPLOYED_CONFIG.indexer,
    UNDEPLOYED_CONFIG.indexerWS
  );

  // 3. Load compiled Hello World contract module
  const contractModulePath = path.join(
    process.cwd(),
    "contracts",
    "managed",
    "hello-world",
    "contract",
    "index.cjs"
  );

  if (!fs.existsSync(contractModulePath)) {
    throw new Error("Contract module not found. Run your compile step first.");
  }

  const HelloWorldModule = await import(contractModulePath);

  // 4. Query latest contract state from indexer
  const state = await provider.queryContractState(contractAddress);

  if (!state) {
    console.log("No state found for this contract (yet).");
    return;
  }

  // 5. Decode ledger view and print message
  const ledger = HelloWorldModule.ledger(state.data);
  const message = Buffer.from(ledger.message).toString();

  console.log("Current message on-chain:", `"${message}"`);
}

main().catch((err) => {
  console.error("Error querying contract state:", err);
  process.exit(1);
});
