import { invoke } from "@tauri-apps/api/core";

/** Opens the system file manager at `path` (a file is selected, a folder is opened). */
export async function revealInFolder(path: string): Promise<void> {
  await invoke("reveal_in_folder", { path });
}
