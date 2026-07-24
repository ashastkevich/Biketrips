export function normalizeRouteFileName(fileName: string): string {
  if (!/[ÐÑ][\u0080-\u00bf]/.test(fileName)) return fileName;

  try {
    return Buffer.from(fileName, "latin1").toString("utf8");
  } catch {
    return fileName;
  }
}
