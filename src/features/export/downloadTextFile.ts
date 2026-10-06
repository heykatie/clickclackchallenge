/** Hands the browser a text file to save. On an iPad this opens the share sheet, where staff can save to Files. */
export function downloadTextFile(fileName: string, text: string, type = "text/csv;charset=utf-8"): void {
  // The byte-order mark makes Excel read accented names as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari reads the file after the click returns, so the URL is released a moment later.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
