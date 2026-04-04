export type ParsedRow = { segIndex: number; segment: string; pos: number; value: string };

export function parseX12(x12: string, elementSep = "*", segmentTerm = "~"): ParsedRow[] {
  const raw = x12.trim();
  if (!raw) return [];
  const segs = raw.split(segmentTerm).map((s) => s.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  segs.forEach((seg, idx) => {
    const parts = seg.split(elementSep);
    const tag = parts[0]?.trim() ?? "";
    parts.slice(1).forEach((value, i) => rows.push({ segIndex: idx + 1, segment: tag, pos: i + 1, value }));
  });
  return rows;
}
