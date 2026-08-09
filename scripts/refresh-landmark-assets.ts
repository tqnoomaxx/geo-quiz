import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseRawLandmarkSnapshot } from "../src/content/schema";

const projectRoot = resolve(import.meta.dirname, "..");
const snapshot = parseRawLandmarkSnapshot(
  JSON.parse(
    await readFile(resolve(projectRoot, "content-src/landmarks-core.v1.json"), "utf8")
  )
);
const outputDirectory = resolve(projectRoot, "content-src/landmark-images");
await mkdir(outputDirectory, { recursive: true });

for (const landmark of snapshot.entities) {
  const response = await fetch(landmark.image.downloadUrl, {
    headers: {
      "User-Agent":
        "GeoAppContentBuilder/1.0 (educational project; https://github.com/tqnoomaxx/geo-quiz)"
    }
  });
  if (!response.ok) {
    throw new Error(`${landmark.id}: Download schlug mit ${response.status} fehl.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== landmark.image.bytes || digest !== landmark.image.sha256) {
    throw new Error(`${landmark.id}: Bild entspricht nicht dem geprüften Snapshot.`);
  }
  await writeFile(resolve(outputDirectory, landmark.image.filename), bytes);
}

process.stdout.write(`Landmark-Fotos ${snapshot.datasetVersion}: ${snapshot.entities.length} Dateien geprüft\n`);
