import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const SAMPLE_DIR = path.join(process.cwd(), "data", "samples");

export async function GET(req: NextRequest) {
  const sample = req.nextUrl.searchParams.get("name");
  if (!sample) {
    return NextResponse.json({ error: "Sample name is required." }, { status: 400 });
  }

  try {
    const filePath = path.join(SAMPLE_DIR, path.basename(sample));
    const xml = await fs.readFile(filePath, "utf8");
    return NextResponse.json({ name: path.basename(sample), xml });
  } catch (error) {
    return NextResponse.json({ error: `Unable to load sample: ${(error as Error).message}` }, { status: 404 });
  }
}

