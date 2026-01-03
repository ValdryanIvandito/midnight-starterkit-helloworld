import fs from "node:fs";
import path from "node:path";

/**
 * Menulis atau memperbarui key-value di file .env
 * - Jika key sudah ada → update
 * - Jika belum ada → append
 * - Tidak menghapus entry lain
 */
export function upsertEnv(values: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), ".env");

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  for (const [key, value] of Object.entries(values)) {
    // Escape karakter regex agar key aman diproses
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedKey}=.*$`, "m");

    if (regex.test(envContent)) {
      // Update value jika key sudah ada
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Tambahkan key baru di akhir file
      envContent += `${
        envContent.endsWith("\n") || envContent === "" ? "" : "\n"
      }${key}=${value}\n`;
    }
  }

  fs.writeFileSync(envPath, envContent, { encoding: "utf-8" });
}
