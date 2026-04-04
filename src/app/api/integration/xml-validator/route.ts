import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCHEMA_DIR = path.join(process.cwd(), "data", "otmxsd");
const SAMPLE_DIR = path.join(process.cwd(), "data", "samples");

const PRESET_SCHEMAS = [
  "Transmission.xsd",
  "Order.xsd",
  "Shipment.xsd",
  "Item.xsd",
  "Finance.xsd",
  "LocationContact.xsd",
  "Rate.xsd",
  "Planning.xsd",
  "Document.xsd",
];

type ValidationError = {
  line?: number;
  column?: number;
  message: string;
};

type BusinessIssue = {
  severity: "warning" | "error";
  line?: number;
  message: string;
};

type RootInfo = {
  prefix: string | null;
  localName: string;
};

async function listSchemas() {
  const files = await fs.readdir(SCHEMA_DIR);
  return files
    .filter((name) => name.endsWith(".xsd"))
    .sort((a, b) => a.localeCompare(b));
}

async function listSamples() {
  try {
    const files = await fs.readdir(SAMPLE_DIR);
    return files.filter((name) => name.endsWith(".xml")).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function detectRootElement(xml: string): RootInfo | null {
  const cleaned = xml.replace(/^\s*<\?xml[^>]*\?>\s*/i, "");
  const match = cleaned.match(/^<\s*(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)\b/);
  if (!match) return null;
  return {
    prefix: match[1] ?? null,
    localName: match[2],
  };
}

function detectNamespaces(xml: string) {
  const cleaned = xml.replace(/^\s*<\?xml[^>]*\?>\s*/i, "");
  const rootOpenTag = cleaned.match(/^<[^>]+>/)?.[0] ?? "";
  const matches = Array.from(rootOpenTag.matchAll(/xmlns(?::([A-Za-z_][\w.-]*))?="([^"]+)"/g));
  return matches.map((m) => ({ prefix: m[1] ?? null, uri: m[2] }));
}

function detectInsights(xml: string, root: RootInfo | null, schemaName: string | null) {
  const insights: string[] = [];
  if (root?.localName === "Transmission" && schemaName === "Transmission.xsd") {
    if (xml.includes("<otm:ShipmentStatus") || xml.includes("<ShipmentStatus")) {
      insights.push(
        "This looks like a Transmission containing ShipmentStatus, but Transmission.xsd expects a transaction wrapper structure under GLogXMLElement (for example TransactionHeader/GLogXMLTransaction), not ShipmentStatus directly."
      );
    }
    if (xml.includes("<otm:GLogXMLElement>") && !xml.includes("<otm:GLogXMLTransaction")) {
      insights.push(
        "Possible issue: GLogXMLElement contains the business object directly. For this schema version, a GLogXMLTransaction wrapper may be required."
      );
    }
  }
  return insights;
}

function lineNumberForIndex(text: string, index: number) {
  return text.slice(0, Math.max(index, 0)).split(/\r?\n/).length;
}

function runBusinessChecks(xml: string) {
  const issues: BusinessIssue[] = [];

  const pushIssue = (severity: "warning" | "error", index: number, message: string) => {
    issues.push({ severity, line: lineNumberForIndex(xml, index), message });
  };

  const hasNonEmptyTag = (text: string, tagName: string) => {
    const tag = new RegExp(`<(?:(\\w+):)?${tagName}\\b[^>]*>\\s*([^<\\s][\\s\\S]*?)<\\/(?:(\\w+):)?${tagName}>`);
    return tag.test(text);
  };

  const hasTag = (text: string, tagName: string) => {
    const tag = new RegExp(`<(?:(\\w+):)?${tagName}\\b[^>]*>`);
    return tag.test(text);
  };

  const gidContainers = Array.from(
    xml.matchAll(/<(?:(\w+):)?([A-Za-z_][\w.-]*Gid)\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/g)
  );

  for (const match of gidContainers) {
    const tagName = match[2];
    const inner = match[3] ?? "";
    const hasGidBlock = /<(?:(\w+):)?Gid\b[^>]*>/.test(inner);
    const hasXid = /<(?:(\w+):)?Xid\b[^>]*>\s*[^<\s][\s\S]*?<\/(?:(\w+):)?Xid>/.test(inner);

    if (!hasGidBlock) {
      pushIssue("warning", match.index ?? 0, `${tagName} does not include a nested Gid block. OTM often expects a concrete Gid/Xid value here even when the XSD allows it to be omitted.`);
      continue;
    }

    if (!hasXid) {
      pushIssue("warning", match.index ?? 0, `${tagName} has a Gid container but no Xid value. The shipped XSD does not require Xid here, but OTM business validation commonly does.`);
    }
  }

  const refnumContainers = Array.from(
    xml.matchAll(/<(?:(\w+):)?([A-Za-z_][\w.-]*Refnum)\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/g)
  );

  for (const match of refnumContainers) {
    const tagName = match[2];
    const inner = match[3] ?? "";
    const hasValue = new RegExp(`<(?:(\\w+):)?${tagName}Value\\b[^>]*>\\s*[^<\\s][\\s\\S]*?<\\/(?:(\\w+):)?${tagName}Value>`).test(inner);

    if (!hasValue) {
      pushIssue("error", match.index ?? 0, `${tagName} is missing ${tagName}Value. The XSD may not flag it depending on where validation stops, but in OTM a Refnum-style structure is not useful/valid without its value element.`);
    }
  }

  const aliasContainers = Array.from(
    xml.matchAll(/<(?:(\w+):)?([A-Za-z_][\w.-]*Alias)\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/g)
  );
  for (const match of aliasContainers) {
    const tagName = match[2];
    const inner = match[3] ?? "";
    if (tagName === "Alias") continue;
    if (!hasTag(inner, `${tagName}QualifierGid`) && hasNonEmptyTag(inner, `${tagName}Value`)) {
      pushIssue("warning", match.index ?? 0, `${tagName} has a value but no ${tagName}QualifierGid. In OTM alias values are usually ambiguous without a qualifier.`);
    }
    if (hasTag(inner, `${tagName}QualifierGid`) && !hasNonEmptyTag(inner, `${tagName}Value`)) {
      pushIssue("error", match.index ?? 0, `${tagName} has ${tagName}QualifierGid but no ${tagName}Value.`);
    }
  }

  const remarkContainers = Array.from(
    xml.matchAll(/<(?:(\w+):)?Remark\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?Remark>/g)
  );
  for (const match of remarkContainers) {
    const inner = match[2] ?? "";
    if (hasTag(inner, "RemarkQualifierGid") && !hasNonEmptyTag(inner, "RemarkText")) {
      pushIssue("error", match.index ?? 0, `Remark has RemarkQualifierGid but no RemarkText.`);
    }
    if (!hasNonEmptyTag(inner, "RemarkText")) {
      pushIssue("warning", match.index ?? 0, `Remark is present without non-empty RemarkText.`);
    }
  }

  const dateTimeContainers = Array.from(
    xml.matchAll(/<(?:(\w+):)?([A-Za-z_][\w.-]*(?:Dt|Date|Time))\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/g)
  );
  for (const match of dateTimeContainers) {
    const tagName = match[2];
    const inner = match[3] ?? "";
    if (hasTag(inner, "GLogDate") && !hasNonEmptyTag(inner, "GLogDate")) {
      pushIssue("error", match.index ?? 0, `${tagName} contains GLogDate but it is empty.`);
    }
    const glogDateMatch = inner.match(/<(?:(\w+):)?GLogDate\b[^>]*>\s*([^<\s][\s\S]*?)<\/(?:(\w+):)?GLogDate>/);
    if (glogDateMatch && !/^\d{14}$/.test(glogDateMatch[2].trim())) {
      pushIssue("warning", match.index ?? 0, `${tagName} has GLogDate '${glogDateMatch[2].trim()}', which does not match the common OTM YYYYMMDDHHMMSS format.`);
    }
    if (hasTag(inner, "GLogDate") && !hasNonEmptyTag(inner, "TZId")) {
      pushIssue("warning", match.index ?? 0, `${tagName} has GLogDate but no TZId. OTM often processes these more reliably with an explicit timezone.`);
    }
  }

  const transmissionHeaderMatch = xml.match(/<(?:(\w+):)?TransmissionHeader\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?TransmissionHeader>/);
  if (transmissionHeaderMatch) {
    const inner = transmissionHeaderMatch[2] ?? "";
    if (!hasNonEmptyTag(inner, "SenderTransmissionNo")) {
      pushIssue("warning", transmissionHeaderMatch.index ?? 0, `TransmissionHeader is missing SenderTransmissionNo.`);
    }

    const ackSpecMatch = inner.match(/<(?:(\w+):)?AckSpec\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?AckSpec>/);
    if (ackSpecMatch) {
      const ackInner = ackSpecMatch[2] ?? "";
      if (!hasTag(ackInner, "ComMethodGid")) {
        pushIssue("warning", (transmissionHeaderMatch.index ?? 0) + (ackSpecMatch.index ?? 0), `AckSpec is present without ComMethodGid.`);
      }
      if (!hasTag(ackInner, "ContactGid")) {
        pushIssue("warning", (transmissionHeaderMatch.index ?? 0) + (ackSpecMatch.index ?? 0), `AckSpec is present without ContactGid.`);
      }
    }
  }

  const shipmentStatusMatch = xml.match(/<(?:(\w+):)?ShipmentStatus\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?ShipmentStatus>/);
  if (shipmentStatusMatch) {
    const inner = shipmentStatusMatch[2] ?? "";
    if (!hasNonEmptyTag(inner, "StatusLevel")) {
      pushIssue("warning", shipmentStatusMatch.index ?? 0, `ShipmentStatus is missing StatusLevel.`);
    }
    if (!hasTag(inner, "EventDt")) {
      pushIssue("warning", shipmentStatusMatch.index ?? 0, `ShipmentStatus is missing EventDt.`);
    }
    if (!hasTag(inner, "StatusCodeGid")) {
      pushIssue("warning", shipmentStatusMatch.index ?? 0, `ShipmentStatus is missing StatusCodeGid.`);
    }
    if (!hasTag(inner, "ShipmentGid") && !hasTag(inner, "ShipmentRefnum")) {
      pushIssue("warning", shipmentStatusMatch.index ?? 0, `ShipmentStatus has neither ShipmentGid nor ShipmentRefnum to identify the target shipment.`);
    }
    if (hasTag(inner, "ShipmentRefnum") && !hasTag(inner, "ShipmentRefnumQualifierGid")) {
      pushIssue("warning", shipmentStatusMatch.index ?? 0, `ShipmentStatus has ShipmentRefnum but no ShipmentRefnumQualifierGid.`);
    }
  }

  const orderBaseMatch = xml.match(/<(?:(\w+):)?(OrderBase|Release|OrderRelease|OrderMovement|OrderStatus)\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/);
  if (orderBaseMatch) {
    const objectName = orderBaseMatch[2];
    const inner = orderBaseMatch[3] ?? "";
    if (!hasTag(inner, `${objectName}Gid`) && !hasTag(inner, `${objectName}Refnum`) && !hasTag(inner, "OrderRefnum") && !hasTag(inner, "ReleaseRefnum")) {
      pushIssue("warning", orderBaseMatch.index ?? 0, `${objectName} does not include an obvious identifier (${objectName}Gid / refnum).`);
    }
    if (hasTag(inner, "EarlyPickupDt") && !hasTag(inner, "LatePickupDt")) {
      pushIssue("warning", orderBaseMatch.index ?? 0, `${objectName} has EarlyPickupDt without LatePickupDt.`);
    }
    if (hasTag(inner, "EarlyDeliveryDt") && !hasTag(inner, "LateDeliveryDt")) {
      pushIssue("warning", orderBaseMatch.index ?? 0, `${objectName} has EarlyDeliveryDt without LateDeliveryDt.`);
    }
  }

  const financeMatch = xml.match(/<(?:(\w+):)?(Invoice|Voucher|Billing|Accrual|FinancialSystemFeed|Claim)\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?\2>/);
  if (financeMatch) {
    const objectName = financeMatch[2];
    const inner = financeMatch[3] ?? "";
    if (!hasTag(inner, `${objectName}Gid`) && !hasTag(inner, `${objectName}Refnum`) && !hasTag(inner, "Refnum")) {
      pushIssue("warning", financeMatch.index ?? 0, `${objectName} does not include an obvious identifier (${objectName}Gid / refnum).`);
    }
    if (hasTag(inner, "InvoiceDate") && !hasNonEmptyTag(inner, "InvoiceDate")) {
      pushIssue("warning", financeMatch.index ?? 0, `${objectName} includes InvoiceDate but it appears empty or incomplete.`);
    }
  }

  const locationMatch = xml.match(/<(?:(\w+):)?Location\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?Location>/);
  if (locationMatch) {
    const inner = locationMatch[2] ?? "";
    if (!hasTag(inner, "LocationGid")) {
      pushIssue("warning", locationMatch.index ?? 0, `Location is missing LocationGid.`);
    }
    if (!hasTag(inner, "LocationName") && !hasTag(inner, "Address")) {
      pushIssue("warning", locationMatch.index ?? 0, `Location has neither LocationName nor Address details.`);
    }
  }

  const itemMatch = xml.match(/<(?:(\w+):)?Item\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?Item>/);
  if (itemMatch) {
    const inner = itemMatch[2] ?? "";
    if (!hasTag(inner, "ItemGid")) {
      pushIssue("warning", itemMatch.index ?? 0, `Item is missing ItemGid.`);
    }
    if (!hasTag(inner, "ItemName") && !hasTag(inner, "ItemDescription")) {
      pushIssue("warning", itemMatch.index ?? 0, `Item has no ItemName or ItemDescription.`);
    }
  }

  const contactMatch = xml.match(/<(?:(\w+):)?Contact\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?Contact>/);
  if (contactMatch) {
    const inner = contactMatch[2] ?? "";
    if (!hasTag(inner, "ContactGid")) {
      pushIssue("warning", contactMatch.index ?? 0, `Contact is missing ContactGid.`);
    }
    if (!hasTag(inner, "EmailAddress") && !hasTag(inner, "PhoneNumber") && !hasTag(inner, "ComMethodGid")) {
      pushIssue("warning", contactMatch.index ?? 0, `Contact has no obvious communication method (email / phone / ComMethodGid).`);
    }
  }

  const serviceProviderAliasBlocks = Array.from(xml.matchAll(/<(?:(\w+):)?ServiceProviderAlias\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?ServiceProviderAlias>/g));
  for (const match of serviceProviderAliasBlocks) {
    const inner = match[2] ?? "";
    if (!hasTag(inner, "ServiceProviderAliasQualifierGid")) {
      pushIssue("warning", match.index ?? 0, `ServiceProviderAlias is missing ServiceProviderAliasQualifierGid.`);
    }
    if (!hasNonEmptyTag(inner, "ServiceProviderAliasValue")) {
      pushIssue("error", match.index ?? 0, `ServiceProviderAlias is missing ServiceProviderAliasValue.`);
    }
  }

  const stopRefnums = Array.from(xml.matchAll(/<(?:(\w+):)?StopRefnum\b[^>]*>([\s\S]*?)<\/(?:(\w+):)?StopRefnum>/g));
  for (const match of stopRefnums) {
    const inner = match[2] ?? "";
    if (!hasTag(inner, "StopRefnumQualifierGid")) {
      pushIssue("warning", match.index ?? 0, `StopRefnum is missing StopRefnumQualifierGid.`);
    }
    if (!hasNonEmptyTag(inner, "StopRefnumValue")) {
      pushIssue("error", match.index ?? 0, `StopRefnum is missing StopRefnumValue.`);
    }
  }

  const emptySimpleTags = Array.from(
    xml.matchAll(/<(?:(\w+):)?(Xid|DomainName|RefnumValue|RemarkText|GLogDate|TZId)\b[^>]*>\s*<\/(?:(\w+):)?\2>/g)
  );
  for (const match of emptySimpleTags) {
    pushIssue("error", match.index ?? 0, `${match[2]} is present but empty.`);
  }

  return issues;
}

function autoDetectSchemaName(xml: string, availableSchemas: string[]) {
  const root = detectRootElement(xml);
  if (!root) return null;

  const direct = `${root.localName}.xsd`;
  if (availableSchemas.includes(direct)) return direct;

  if (root.localName === "Transmission" && availableSchemas.includes("Transmission.xsd")) {
    return "Transmission.xsd";
  }

  if (root.localName === "TransmissionAck" && availableSchemas.includes("Transmission.xsd")) {
    return "Transmission.xsd";
  }

  return null;
}

function parseXmllintErrors(stderr: string): ValidationError[] {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Schemas parser error"));

  const out: ValidationError[] = [];
  for (const line of lines) {
    if (line === "^") {
      continue;
    }

    const schemaStyle = line.match(/:(\d+):(\d+):\s+(.*)$/);
    if (schemaStyle) {
      out.push({
        line: Number(schemaStyle[1]),
        column: Number(schemaStyle[2]),
        message: schemaStyle[3],
      });
      continue;
    }

    const parserStyle = line.match(/^[^:]+:(\d+):\s+(.*)$/);
    if (parserStyle) {
      out.push({
        line: Number(parserStyle[1]),
        message: parserStyle[2],
      });
      continue;
    }

    if (out.length > 0 && /^</.test(line)) {
      const last = out[out.length - 1];
      if (!last.message.includes(" | Context: ")) {
        last.message = `${last.message} | Context: ${line}`;
      }
      continue;
    }

    out.push({ message: line });
  }

  return out;
}

function sanitizeValidatorOutput(text: string) {
  return text
    .replace(/\/var\/folders\/[^:\n]+\/payload\.xml/g, "payload.xml")
    .replace(/\/tmp\/[^:\n]+\/payload\.xml/g, "payload.xml")
    .replace(/\/Users\/[^:\n]+\/otmos-web\/data\/otmxsd\//g, "schema/");
}

export async function GET() {
  try {
    const schemas = await listSchemas();
    const samples = await listSamples();
    return NextResponse.json({
      schemas,
      samples,
      presetSchemas: PRESET_SCHEMAS.filter((name) => schemas.includes(name)),
      defaultSchema: "Transmission.xsd",
    });
  } catch (error) {
    return NextResponse.json(
      {
        schemas: [],
        error: `Unable to read schema directory: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { xml?: string; schema?: string | null; mode?: "auto" | "manual"; sample?: string | null };
    let xml = body.xml?.trim() ?? "";
    if (!xml && body.sample) {
      const samplePath = path.join(SAMPLE_DIR, path.basename(body.sample));
      xml = (await fs.readFile(samplePath, "utf8")).trim();
    }
    if (!xml) {
      return NextResponse.json({ ok: false, error: "XML is required." }, { status: 400 });
    }

    const schemas = await listSchemas();
    const root = detectRootElement(xml);
    const autoSchema = autoDetectSchemaName(xml, schemas);
    const schemaName = body.mode === "manual" ? body.schema ?? null : body.schema ?? autoSchema;

    if (!schemaName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not auto-detect a schema for this root element. Choose one manually.",
          schemas,
          root,
          namespaces: detectNamespaces(xml),
          autoDetectedSchema: autoSchema,
          insights: detectInsights(xml, root, autoSchema),
          businessIssues: runBusinessChecks(xml),
        },
        { status: 400 }
      );
    }

    if (!schemas.includes(schemaName)) {
      return NextResponse.json({ ok: false, error: `Unknown schema: ${schemaName}` }, { status: 400 });
    }

    const schemaPath = path.join(SCHEMA_DIR, schemaName);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "otmos-xml-validate-"));
    const xmlPath = path.join(tempDir, "payload.xml");
    await fs.writeFile(xmlPath, xml, "utf8");

    try {
      await execFileAsync("/usr/bin/xmllint", ["--noout", "--schema", schemaPath, xmlPath], {
        cwd: SCHEMA_DIR,
        maxBuffer: 1024 * 1024 * 8,
      });

      return NextResponse.json({
        ok: true,
        schema: schemaName,
        autoDetectedSchema: autoSchema,
        root,
        namespaces: detectNamespaces(xml),
        insights: detectInsights(xml, root, schemaName),
        businessIssues: runBusinessChecks(xml),
        errors: [],
      });
    } catch (error) {
      const stderr = sanitizeValidatorOutput((error as { stderr?: string }).stderr ?? "");
      return NextResponse.json({
        ok: false,
        schema: schemaName,
        autoDetectedSchema: autoSchema,
        root,
        namespaces: detectNamespaces(xml),
        insights: detectInsights(xml, root, schemaName),
        businessIssues: runBusinessChecks(xml),
        errors: parseXmllintErrors(stderr),
        raw: stderr,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `Validation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
