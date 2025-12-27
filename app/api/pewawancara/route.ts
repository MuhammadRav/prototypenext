import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const dataPath = join(process.cwd(), "data", "db.json");
    const data = JSON.parse(readFileSync(dataPath, "utf-8"));

    return Response.json(data.pewawancara || []);
  } catch (error) {
    console.error("Error reading pewawancara data:", error);
    return Response.json({ error: "Failed to load data" }, { status: 500 });
  }
}
