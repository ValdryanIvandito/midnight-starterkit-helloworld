// Libraries
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { WebSocket } from "ws";

// Midnight Libraries
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { nativeToken } from "@midnight-ntwrk/ledger";

// Internal Modules
import { UndeployedNetwork } from "../config/network";
import { setWalletProvider, buildWallet } from "./wallet";
import { loadContract } from "./contract";
import { setProviders } from "./provider";
import { waitForFunds } from "../utils/waitForFunds";

dotenv.config();

// Fix WebSocket untuk Node.js
// @ts-ignore
globalThis.WebSocket = WebSocket;

const walletSeed: string = process.env.WALLET_SEED || "";

if (!walletSeed) {
  console.log("walletSeed doesn't exist, please put walletSeed in .env");
}

// Konfigurasi network
const config = new UndeployedNetwork();

async function deploy() {
  console.log("Contract deployment on process...\n");

  try {
    // Build wallet dari seed
    const { wallet, state } = await buildWallet(config, walletSeed);

    console.log(`Your wallet address is: ${state.address}`);

    let balance = state.balances[nativeToken()] || 0n;

    // Jika wallet belum ada saldo → tunggu faucet
    if (balance === 0n) {
      console.log(`Your wallet balance is: 0`);
      console.log(`Please get some funds, Waiting to receive tokens...`);
      balance = await waitForFunds(wallet);
    }

    console.log(`Balance: ${balance}`);

    // Load kontrak hasil compile
    console.log("Loading contract...");
    const contractPath = path.join(process.cwd(), "contracts");
    const contractInstance = await loadContract(contractPath, "hello-world");

    // Setup provider wallet
    const walletProvider = setWalletProvider(wallet, state);

    // Setup provider kontrak
    console.log("Setting up providers...");
    const zkConfigPath = path.join(contractPath, "managed", "hello-world");
    const providers = await setProviders(
      "hello-world-state",
      config,
      zkConfigPath,
      walletProvider
    );

    console.log("Deploying contract (30-60 seconds)...");

    // Deploy kontrak
    const deployed = await deployContract(providers, {
      contract: contractInstance,
      privateStateId: "helloWorldState",
      initialPrivateState: {},
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    if (contractAddress) {
      console.log("\nYour contract deployment is success!");
      console.log(`Contract: ${contractAddress}\n`);

      const info = {
        contractAddress,
        deployedAt: new Date().toISOString(),
      };

      // Simpan informasi deployment
      fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));
      console.log("Saved to deployment.json");
    } else {
      console.log("\nYour contract deployment is failed!");
    }
  } catch (error) {
    console.error("Failed:", error);
  }
}

deploy().catch(console.error);
