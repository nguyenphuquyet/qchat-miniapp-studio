/**
 * Clipboard helpers.
 *
 * `navigator.clipboard` is preferred; document.execCommand is kept as a fallback
 * because WebView2 can deny the async clipboard API in some situations (e.g. when
 * the document is not focused).
 */

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function readText(): Promise<string | null> {
  try {
    if (navigator.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
    /* clipboard read denied (permission / focus) */
  }
  return null;
}
