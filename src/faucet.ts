// Copyright 2025 Brick Towers

import { LocalTestConfig, type TestConfiguration, TestWallet } from "./commons";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import type { Resource } from "@midnight-ntwrk/wallet";

import pino from "pino";
import pinoPretty from "pino-pretty";

import dotenv from "dotenv";
dotenv.config();

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const TRANSFER_AMOUNT = 1_000_000_000_000n; // 1e12, adjust as needed

const receiverAddress: string = process.env.WALLET_ADDR || "";

function createLogger() {
  const pretty = pinoPretty({
    colorize: true,
    sync: true,
  });

  return pino(
    {
      level: DEFAULT_LOG_LEVEL,
    },
    pretty
  );
}

async function main(): Promise<void> {
  const logger = createLogger();

  if (!receiverAddress) {
    logger.info(
      "Wallet address not found, please put your wallet address on .env file"
    );
    return;
  }

  logger.info({ receiverAddress }, "Starting transfer");

  const testWallet = new TestWallet(logger);
  const testConfiguration: TestConfiguration = new LocalTestConfig();

  let wallet: (Wallet & Resource) | null = null;

  try {
    wallet = await testWallet.setup(testConfiguration);
    logger.info("Wallet setup complete");

    const transferRecipe = await wallet.transferTransaction([
      {
        amount: TRANSFER_AMOUNT,
        receiverAddress,
        type: nativeToken(),
      },
    ]);

    logger.info(
      {
        amount: TRANSFER_AMOUNT.toString(),
        receiverAddress,
      },
      "Transfer recipe created"
    );

    const transaction = await wallet.proveTransaction(transferRecipe);
    logger.info("Transaction proof generated");

    const txHash = await wallet.submitTransaction(transaction);
    logger.info({ txHash }, "Transaction submitted");
  } catch (err) {
    logger.error(
      { err },
      "Error while preparing/submitting transfer transaction"
    );
    // Non-zero exit for CI or scripts
    process.exitCode = 1;
  } finally {
    if (wallet) {
      try {
        await wallet.close();
        logger.info("Wallet closed");
      } catch (closeErr) {
        logger.warn({ closeErr }, "Failed to close wallet cleanly");
      }
    }
  }
}

main().catch((err) => {
  // Fallback if something happens before logger is available
  console.error("Unhandled error in main:", err);
  process.exit(1);
});
