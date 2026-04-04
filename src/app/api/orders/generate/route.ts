import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const xml = `<Order kind="${body.orderKind}" domain="${body.domain}" baseXid="${body.baseXid}" currency="${body.currency}"><Mode>${body.inputMode}</Mode></Order>`;
  return NextResponse.json({ xml, summary: { orderKind: body.orderKind, inputMode: body.inputMode, domain: body.domain, baseXid: body.baseXid } });
}
