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

function matchesSnapshot(
  bytes: Buffer,
  expectedBytes: number,
  expectedSha256: string
) {
  return (
    bytes.length === expectedBytes &&
    createHash("sha256").update(bytes).digest("hex") === expectedSha256
  );
}

async function downloadWithRetry(url: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "GeoAppContentBuilder/1.0 (educational project; https://github.com/tqnoomaxx/geo-quiz)"
      }
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Download schlug mit ${response.status} fehl.`);
    }
    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, 1_500 * (attempt + 1))
    );
  }
  throw new Error("Download blieb nach fünf Versuchen erfolglos.");
}

for (const landmark of snapshot.entities) {
  const outputPath = resolve(outputDirectory, landmark.image.filename);
  const existing = await readFile(outputPath).catch(() => undefined);
  if (
    existing &&
    matchesSnapshot(existing, landmark.image.bytes, landmark.image.sha256)
  ) {
    continue;
  }

  const bytes = await downloadWithRetry(landmark.image.downloadUrl).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${landmark.id}: ${message}`);
    }
  );
  if (!matchesSnapshot(bytes, landmark.image.bytes, landmark.image.sha256)) {
    throw new Error(`${landmark.id}: Bild entspricht nicht dem geprüften Snapshot.`);
  }
  await writeFile(outputPath, bytes);
}

process.stdout.write(`Landmark-Fotos ${snapshot.datasetVersion}: ${snapshot.entities.length} Dateien geprüft\n`);
