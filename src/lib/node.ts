import { invoke } from "@tauri-apps/api/core";

/** Mirrors `NodeStatus` in src-tauri/src/commands/build.rs. */
export type NodeStatus = {
  found: boolean;
  version: string | null;
  path: string | null;
  can_auto_install: boolean;
};

/** Mirrors `NodeInstallResult` in src-tauri/src/commands/build.rs. */
export type NodeInstallResult = { success: boolean; message: string };

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Is Node.js (node + npm) reachable through the PATH environment variable? */
export async function checkNode(): Promise<NodeStatus> {
  if (!isTauri) return { found: true, version: null, path: null, can_auto_install: false };
  return invoke<NodeStatus>("check_node");
}

/** Installs Node.js LTS. Call only after the user agreed; output streams to the build log. */
export async function installNode(): Promise<NodeInstallResult> {
  return invoke<NodeInstallResult>("install_node");
}
