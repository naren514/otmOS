import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const COMPONENTS_PATH = path.join(process.cwd(), "public", "data_dictionary_diagrams", "project-html", "Components.htm");

export async function GET() {
  try {
    const html = await fs.readFile(COMPONENTS_PATH, "utf8");
    const items = Array.from(
      html.matchAll(/<A HREF\s*=\s*([^\s>]+)\s+TARGET=REPWINDOW><FONT FACE=Arial SIZE=2>([\s\S]*?)<\/FONT><\/TD><\/TR>/gi)
    ).map((match) => ({
      href: match[1].replace(/['"]/g, "").trim(),
      label: match[2].replace(/\s+/g, " ").trim(),
    }));

    return NextResponse.json({
      title: "Oracle Transportation Management Data Model",
      items,
      basePath: "/data_dictionary_diagrams/project-html",
      defaultHref: items[0]?.href ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, items: [] }, { status: 500 });
  }
}

