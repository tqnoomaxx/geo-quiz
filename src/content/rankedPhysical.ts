import rankedPhysicalIndexJson from "./generated/ranked-physical-index-v1.json";
import { geoDataset } from "./dataset";
import {
  parseGeoDataset,
  parseRankedPhysicalContentPack,
  type GeoDataset,
  type RankedPhysicalContentPack
} from "./schema";

export type RankedPhysicalTopic = "longest-rivers" | "highest-mountains";

export const rankedPhysicalIndex = rankedPhysicalIndexJson;

let packPromise: Promise<RankedPhysicalContentPack> | undefined;
let datasetPromise: Promise<GeoDataset> | undefined;

export function loadRankedPhysicalPack() {
  packPromise ??= import("./generated/ranked-physical-v1.json").then(
    (module) => {
      const pack = parseRankedPhysicalContentPack(module.default);
      if (pack.datasetVersion !== geoDataset.version) {
        throw new Error(
          `Physisches Ranglistenpaket ${pack.datasetVersion} passt nicht zu ${geoDataset.version}.`
        );
      }
      return pack;
    }
  );
  return packPromise;
}

export function loadDatasetWithRankedPhysical() {
  datasetPromise ??= loadRankedPhysicalPack().then((pack) =>
    parseGeoDataset({
      ...geoDataset,
      sources: [...geoDataset.sources, ...pack.sources],
      entities: [...geoDataset.entities, ...pack.entities],
      names: [...geoDataset.names, ...pack.names],
      relations: [...geoDataset.relations, ...pack.relations],
      factDefinitions: [...geoDataset.factDefinitions, ...pack.factDefinitions],
      facts: [...geoDataset.facts, ...pack.facts]
    })
  );
  return datasetPromise;
}

export function rankedPhysicalCount(
  topic: RankedPhysicalTopic,
  regionId: string
) {
  if (regionId !== "world") return 0;
  return topic === "longest-rivers"
    ? rankedPhysicalIndex.quality.entityCounts.ranked_river
    : rankedPhysicalIndex.quality.entityCounts.ranked_peak;
}
