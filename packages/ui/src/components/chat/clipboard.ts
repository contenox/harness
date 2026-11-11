function copyWithTextarea(text: string): boolean {
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(area);
    if (previous && typeof previous.focus === "function") previous.focus();
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText &&
    typeof window !== "undefined" &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  try {
    return copyWithTextarea(text);
  } catch (error) {
    console.warn("Clipboard copy failed:", error);
    return false;
  }
}
