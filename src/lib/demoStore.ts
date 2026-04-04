import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "otmos-demo-store.json");

export type DemoStore = {
  qa: {
    config: { baseUrl: string; username: string; browser: "chrome" | "firefox" | "edge" };
    tests: Array<{ id: string; file: string; tags?: string[]; title?: string }>;
    runs: Array<Record<string, unknown>>;
    cycles: Array<Record<string, unknown>>;
  };
  edi: {
    mappings: Array<Record<string, unknown>>;
    docs: Array<Record<string, unknown>>;
  };
  orders: {
    results: Array<Record<string, unknown>>;
  };
};

const defaultStore: DemoStore = {
  qa: {
    config: { baseUrl: "", username: "", browser: "chrome" },
    tests: [
      { id: "Test_01_Login", file: "Tests/SanityBatch/Test_01_Login.ts", tags: ["sanity", "login"], title: "Login" },
      { id: "Test_08_ShipmentSearch", file: "Tests/SanityBatch/Test_08_ShipmentSearch.ts", tags: ["shipment", "search"], title: "Shipment Search" },
      { id: "Gen_ocean_booking_smoke", file: "Tests/Generated/Gen_ocean_booking_smoke.ts", tags: ["generated", "ocean"], title: "Ocean Booking Smoke" },
    ],
    runs: [],
    cycles: [],
  },
  edi: {
    mappings: [
      { id: "m1", version: "4010", txSet: "204", carrier: "industry", segment: "B2", elementPos: 3, code: "SCAC", meaning: "Standard Carrier Alpha Code", notes: "Common carrier identifier", source: "seed" },
    ],
    docs: [],
  },
  orders: {
    results: [],
  },
};

export async function loadStore(): Promise<DemoStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as DemoStore;
  } catch {
    await saveStore(defaultStore);
    return structuredClone(defaultStore);
  }
}

export async function saveStore(store: DemoStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}
