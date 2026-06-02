import { NextRequest, NextResponse } from "next/server";
import { buildReleaseXml, buildPurchaseOrderXml, type ReleaseLine, type PurchaseOrderLine } from "@/lib/xmlBuilder";

type GenerateRequest = {
  orderKind: "Sales Orders" | "Purchase Orders";
  inputMode: "Manual (builder)" | "Import (CSV/Excel)";
  domain: string;
  baseXid: string;
  currency: string;
  shipFromXid: string;
  shipToXid: string;
  shipToText: string;
  itemText: string;
  suppliersText: string;
  supplierShipFromXid: string;
  dcShipToXid: string;
  itemXid: string;
  qty: number;
  value: number;
  importText: string;
  useReleaseSuffixInGid: boolean;
  useReleaseSuffixInLineIds: boolean;
  releases: number;
  minLines: number;
  maxLines: number;
  minQty: number;
  maxQty: number;
  minVal: number;
  maxVal: number;
  seed: number;
  useGzip: boolean;
};

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function parseList(text: string): string[] {
  return text
    .replace(/,/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function randomChoice<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randomInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  arr.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    const {
      orderKind,
      inputMode,
      domain,
      baseXid,
      currency,
      shipFromXid,
      importText,
      useReleaseSuffixInGid,
      useReleaseSuffixInLineIds,
      releases,
      minLines,
      maxLines,
      minQty,
      maxQty,
      minVal,
      maxVal,
      seed,
    } = body;

    let payloads: Array<{
      humanId: string;
      shipFrom: string;
      shipTo: string;
      lineCount: number;
      xml: string;
    }> = [];

    if (inputMode === "Import (CSV/Excel)") {
      // Parse CSV import
      const rows = parseCsv(importText);
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No valid rows found in imported data" },
          { status: 400 }
        );
      }

      if (orderKind === "Sales Orders") {
        // Group by order_id, ship_from_xid, ship_to_xid
        const grouped = groupBy(rows, (r) =>
          [r.order_id, r.ship_from_xid, r.ship_to_xid].join("|")
        );

        let releaseIndex = 1;
        for (const [key, group] of grouped) {
          const [orderId, shipFrom, shipTo] = key.split("|");

          const lines: ReleaseLine[] = group.map((row, idx) => {
            const lineCurrency = row.currency || currency;
            let lineXid = "";

            if (row.release_line_id) {
              lineXid = row.release_line_id;
            } else if (row.line_number) {
              lineXid = `${orderId}_${String(row.line_number).padStart(3, "0")}`;
            } else {
              lineXid = `${orderId}_${String(idx + 1).padStart(3, "0")}`;
            }

            return {
              item_xid: row.item_xid,
              qty: parseInt(row.qty) || 0,
              value: parseFloat(row.value) || 0,
              currency: lineCurrency,
              line_xid: lineXid,
            };
          });

          const xml = buildReleaseXml({
            domain,
            baseReleaseXid: orderId,
            shipFromXid: shipFrom,
            shipToXid: shipTo,
            lines,
            releaseIndex,
            useReleaseSuffixInGid,
            useReleaseSuffixInLineIds,
            currency,
          });

          payloads.push({
            humanId: orderId,
            shipFrom,
            shipTo,
            lineCount: lines.length,
            xml,
          });

          releaseIndex++;
        }
      } else {
        // Purchase Orders
        const grouped = groupBy(rows, (r) => r.po_xid || "");

        let poIndex = 1;
        for (const [poXid, group] of grouped) {
          const firstRow = group[0];

          const lines: PurchaseOrderLine[] = group.map((row, idx) => ({
            packaged_item_xid: row.packaged_item_xid,
            qty: parseInt(row.qty) || 0,
            declared_value: parseFloat(row.declared_value) || 0,
            item_number: row.item_number || "",
            line_number: row.line_number ? parseInt(row.line_number) : idx + 1,
            schedule_number: row.schedule_number ? parseInt(row.schedule_number) : 1,
            currency: row.currency || currency,
          }));

          const xml = buildPurchaseOrderXml({
            domain,
            poXid,
            supplierShipFromXid: firstRow.supplier_ship_from_xid || body.supplierShipFromXid,
            dcShipToXid: firstRow.dc_ship_to_xid || body.dcShipToXid,
            lines,
            currency,
            supplierId: firstRow.supplier_id || "10010",
            supplierName: firstRow.supplier_name || "SUPPLIER",
            leName: firstRow.le_name || "THE HILLMAN GROUP",
            buyer: firstRow.buyer || "THE HILLMAN GROUP",
            supplierSiteName: firstRow.supplier_site_name || "DEFAULT",
            revisionNum: firstRow.revision_num || "0",
            earlyPickupDt: firstRow.early_pickup_dt || "20250718102700",
            latePickupDt: firstRow.late_pickup_dt || "20250725102700",
            tzId: firstRow.tz_id || "Asia/Taipei",
            tzOffset: firstRow.tz_offset || "+08:00",
            planFromLocationXid: firstRow.plan_from_location_xid || "CNNGB",
          });

          payloads.push({
            humanId: poXid,
            shipFrom: firstRow.supplier_ship_from_xid || body.supplierShipFromXid,
            shipTo: firstRow.dc_ship_to_xid || body.dcShipToXid,
            lineCount: lines.length,
            xml,
          });

          poIndex++;
        }
      }
    } else {
      // Manual (builder) mode
      const rand = seededRandom(seed);
      const shipToList = parseList(body.shipToText || "");
      const itemList = parseList(body.itemText || "");
      const supplierList = parseList(body.suppliersText || "");

      if (orderKind === "Sales Orders") {
        for (let i = 1; i <= releases; i++) {
          const numLines = randomInt(minLines, maxLines, rand);
          const lines: ReleaseLine[] = [];

          for (let j = 0; j < numLines; j++) {
            lines.push({
              item_xid: randomChoice(itemList, rand),
              qty: randomInt(minQty, maxQty, rand),
              value: randomInt(minVal, maxVal, rand),
              currency,
            });
          }

          const shipTo = randomChoice(shipToList, rand);
          const xml = buildReleaseXml({
            domain,
            baseReleaseXid: baseXid,
            shipFromXid,
            shipToXid: shipTo,
            lines,
            releaseIndex: i,
            useReleaseSuffixInGid,
            useReleaseSuffixInLineIds,
            currency,
          });

          const releaseId = useReleaseSuffixInGid ? `${baseXid}_R${i}` : baseXid;
          payloads.push({
            humanId: releaseId,
            shipFrom: shipFromXid,
            shipTo,
            lineCount: lines.length,
            xml,
          });
        }
      } else {
        // Purchase Orders
        for (let i = 1; i <= releases; i++) {
          const numLines = randomInt(minLines, maxLines, rand);
          const lines: PurchaseOrderLine[] = [];

          for (let j = 0; j < numLines; j++) {
            lines.push({
              packaged_item_xid: randomChoice(itemList, rand),
              qty: randomInt(minQty, maxQty, rand),
              declared_value: randomInt(minVal, maxVal, rand),
              line_number: j + 1,
              schedule_number: 1,
              currency,
            });
          }

          const supplier = randomChoice(supplierList, rand);
          const dcShipTo = randomChoice(shipToList, rand);
          const poXid = useReleaseSuffixInGid ? `${baseXid}_R${i}` : baseXid;

          const xml = buildPurchaseOrderXml({
            domain,
            poXid,
            supplierShipFromXid: supplier,
            dcShipToXid: dcShipTo,
            lines,
            currency,
          });

          payloads.push({
            humanId: poXid,
            shipFrom: supplier,
            shipTo: dcShipTo,
            lineCount: lines.length,
            xml,
          });
        }
      }
    }

    // Prepare response
    const firstPayload = payloads[0];
    const lastXml = payloads[payloads.length - 1]?.xml || "";

    const zipFiles = payloads.map((p) => ({
      name: `${p.humanId}.xml`,
      contentBase64: Buffer.from(p.xml).toString("base64"),
    }));

    const summary = {
      orderKind,
      inputMode,
      domain,
      baseXid,
      lineCount: payloads.reduce((sum, p) => sum + p.lineCount, 0).toString(),
    };

    const resultPayloads = payloads.map((p) => ({
      humanId: p.humanId,
      shipFrom: p.shipFrom,
      shipTo: p.shipTo,
      lineCount: p.lineCount,
    }));

    return NextResponse.json({
      xml: firstPayload?.xml || "<xml>No orders generated</xml>",
      summary,
      payloads: resultPayloads,
      zipFiles,
      lastXml,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
