// src/main.ts

// External libraries
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { WebSocket } from "ws";

// Midnight library
import { nativeToken } from "@midnight-ntwrk/ledger";

// Internal modules
import { getNewWallet } from "./services/wallet";
import { UndeployedNetwork } from "./config/network";
import { upsertEnv } from "./utils/upsertEnv";

// Fix WebSocket agar kompatibel dengan environment Node.js
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Konfigurasi network (Undeployed / local)
const config = new UndeployedNetwork();

async function main() {
  console.clear();

  console.log(
    chalk.cyan.bold("Midnight Wallet CLI\n") +
      chalk.gray("Network: Undeployed\n")
  );

  // Menu utama CLI
  const { action } = await inquirer.prompt([
    {
      type: "rawlist",
      name: "action",
      message: "What do you want to do?",
      choices: [
        { name: "Create new wallet", value: "create" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  if (action === "exit") {
    console.log(chalk.gray("\nGoodbye 👋"));
    process.exit(0);
  }

  const spinner = ora("Generating wallet...").start();

  try {
    // Generate wallet baru
    const { state, seed } = await getNewWallet(config);

    spinner.succeed(chalk.green("Wallet successfully created"));

    // Save to .env
    upsertEnv({
      WALLET_SEED: seed,
      WALLET_ADDRESS: state.address,
      WALLET_COIN_PUBKEY: state.coinPublicKey,
    });

    console.log(
      chalk.bold("\n📌 Wallet Information\n") +
        chalk.gray("Address  : ") +
        chalk.green(state.address) +
        "\n" +
        chalk.gray("Balance  : ") +
        chalk.yellow((state.balances[nativeToken()] ?? 0n).toString()) +
        "\n" +
        chalk.gray("Saved to : .env")
    );
  } catch (err) {
    spinner.fail(chalk.red("Failed to create wallet"));
    console.error(err);
  }

  console.log(chalk.gray("\n✔ Done\n"));
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
