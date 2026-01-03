import * as Rx from "rxjs";
import { nativeToken } from "@midnight-ntwrk/ledger";
import type { Wallet } from "@midnight-ntwrk/wallet-api";

/**
 * Menunggu wallet:
 * 1. Selesai sync
 * 2. Menerima balance > 0
 */
export async function waitForFunds(wallet: Wallet): Promise<bigint> {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      // Logging progress sinkronisasi wallet
      Rx.tap((state) => {
        if (state.syncProgress) {
          console.log(
            `Sync progress: synced=${state.syncProgress.synced}, sourceGap=${state.syncProgress.lag.sourceGap}, applyGap=${state.syncProgress.lag.applyGap}`
          );
        }
      }),

      // Pastikan wallet sudah fully synced
      Rx.filter((state) => state.syncProgress?.synced === true),

      // Ambil balance native token
      Rx.map((state) => state.balances[nativeToken()] ?? 0n),

      // Tunggu sampai balance masuk
      Rx.filter((balance) => balance > 0n),

      // Informasi wallet sudah ter-fund
      Rx.tap((balance) => console.log(`Wallet funded with balance: ${balance}`))
    )
  );
}
