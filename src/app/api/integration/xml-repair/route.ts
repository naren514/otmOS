import { NextRequest, NextResponse } from "next/server";

type RepairSuggestion = {
  title: string;
  confidence: "high" | "medium" | "low";
  kind: "safe" | "guided";
  description: string;
};

type ValidationErrorInput = {
  line?: number;
  column?: number;
  message: string;
};

function formatXml(xml: string) {
  const trimmed = xml.trim();
  if (!trimmed) return xml;
  const withBreaks = trimmed.replace(/>(\s*)</g, ">\n<");
  const lines = withBreaks.split("\n");
  let indent = 0;

  return lines
    .map((line) => {
      const current = line.trim();
      if (!current) return current;
      if (/^<\//.test(current)) indent = Math.max(indent - 1, 0);
      const formatted = `${"  ".repeat(indent)}${current}`;
      if (/^<[^!?/][^>]*[^/]?>$/.test(current) && !/^<.*<\//.test(current) && !/\/>$/.test(current)) {
        indent += 1;
      }
      return formatted;
    })
    .join("\n");
}

function repairTransmissionWrapper(xml: string) {
  let out = xml;
  const hasTransmission = /<[^>]*Transmission\b/.test(out);
  const hasGLogXMLElement = /<[^>]*GLogXMLElement\b/.test(out);
  const hasGLogXMLTransaction = /<[^>]*GLogXMLTransaction\b/.test(out);
  const hasShipmentStatus = /<[^>]*ShipmentStatus\b/.test(out);

  if (hasTransmission && hasGLogXMLElement && hasShipmentStatus && !hasGLogXMLTransaction) {
    out = out.replace(/(<[^>]*GLogXMLElement[^>]*>)([\s\S]*?)(<\/[^>]*GLogXMLElement>)/, "$1<otm:GLogXMLTransaction>$2</otm:GLogXMLTransaction>$3");
  }
  return out;
}

function normalizeCommonTypos(xml: string) {
  let out = xml;
  out = out.replace(/SHIMENT STATUS/g, "SHIPMENT STATUS");
  return out;
}

function buildSuggestions(xml: string, validationErrors: ValidationErrorInput[] = []) {
  const suggestions: RepairSuggestion[] = [];

  if (xml.includes("SHIMENT STATUS")) {
    suggestions.push({
      title: "Fix obvious typo in transmission text",
      confidence: "high",
      kind: "safe",
      description: "Correct SHIMENT STATUS to SHIPMENT STATUS.",
    });
  }

  if (/ < /.test(xml) || />\s*</.test(xml)) {
    suggestions.push({
      title: "Pretty-print XML",
      confidence: "high",
      kind: "safe",
      description: "Reformat XML to make structural issues easier to inspect.",
    });
  }

  if (/<[^>]*Transmission\b/.test(xml) && /<[^>]*GLogXMLElement\b/.test(xml) && /<[^>]*ShipmentStatus\b/.test(xml) && !/<[^>]*GLogXMLTransaction\b/.test(xml)) {
    suggestions.push({
      title: "Wrap ShipmentStatus in GLogXMLTransaction",
      confidence: "medium",
      kind: "guided",
      description: "TransmissionCommon.xsd indicates GLogXMLElement expects an optional TransactionHeader followed by a GLogXMLTransaction substitution-group member. This draft repair wraps the object accordingly.",
    });
  }

  for (const error of validationErrors) {
    if (error.message.includes("This element is not expected") && error.message.includes("ShipmentStatus")) {
      const found = error.message.match(/Element '\{[^}]+\}([^']+)'/);
      const expected = error.message.match(/Expected is one of \( (.*) \)\./);
      const expectedNames = expected?.[1]
        ?.split(",")
        .map((part) => part.replace(/\{[^}]+\}/g, "").trim())
        .join(", ");
      suggestions.push({
        title: "Schema-aware fix: add expected transaction wrapper",
        confidence: "medium",
        kind: "guided",
        description: `The validator says ${found?.[1] ?? "this element"} is in the wrong slot.${expectedNames ? ` Expected one of: ${expectedNames}.` : ""} The most likely repair is to wrap the business object so it satisfies the transaction position under GLogXMLElement.`,
      });
    }

    if (error.message.toLowerCase().includes("opening and ending tag mismatch")) {
      suggestions.push({
        title: "Fix mismatched opening/closing tags",
        confidence: "medium",
        kind: "guided",
        description: "The XML has a malformed tag pair. Review the indicated line and surrounding element nesting before re-validating.",
      });
    }

    if (error.message.toLowerCase().includes("parser error")) {
      suggestions.push({
        title: "Fix XML syntax before schema validation",
        confidence: "high",
        kind: "safe",
        description: "The document is not well-formed XML yet. Fix syntax errors first, then re-run schema validation.",
      });
    }
  }

  return suggestions.filter((suggestion, index, arr) => arr.findIndex((s) => s.title === suggestion.title) === index);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { xml?: string; applySafeFixes?: boolean; generateDraft?: boolean; validationErrors?: ValidationErrorInput[] };
    const originalXml = body.xml ?? "";
    if (!originalXml.trim()) {
      return NextResponse.json({ ok: false, error: "XML is required." }, { status: 400 });
    }

    const suggestions = buildSuggestions(originalXml, body.validationErrors ?? []);
    let repairedXml = originalXml;

    if (body.applySafeFixes || body.generateDraft) {
      repairedXml = normalizeCommonTypos(repairedXml);
      repairedXml = repairTransmissionWrapper(repairedXml);
      repairedXml = formatXml(repairedXml);
    }

    return NextResponse.json({
      ok: true,
      suggestions,
      repairedXml,
      changed: repairedXml !== originalXml,
      note:
        repairedXml !== originalXml
          ? "Draft repair generated. Re-validate before using it operationally."
          : "No automatic repair was applied. Review the suggestions.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
