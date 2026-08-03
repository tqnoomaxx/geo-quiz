import datasetJson from "./generated/geo-core-mvp-v1.json";
import manifestJson from "./generated/manifest.json";
import {
  parseDatasetManifest,
  parseGeoDataset
} from "./schema";

export const geoDataset = parseGeoDataset(datasetJson);
export const datasetManifest = parseDatasetManifest(manifestJson);
