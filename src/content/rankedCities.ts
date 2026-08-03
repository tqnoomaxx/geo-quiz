import rankedCityIndexJson from "./generated/ranked-cities-index-v1.json";
import { geoDataset } from "./dataset";
import {
  parseGeoDataset,
  parseRankedCityContentPack,
  type GeoDataset,
  type RankedCityContentPack
} from "./schema";

export type RankedCitySetSize = 100 | 250 | 500 | 1000;

export const rankedCityIndex = rankedCityIndexJson;

let packPromise: Promise<RankedCityContentPack> | undefined;
let datasetPromise: Promise<GeoDataset> | undefined;

export function loadRankedCityPack() {
  packPromise ??= import("./generated/ranked-cities-v1.json").then((module) => {
    const pack = parseRankedCityContentPack(module.default);
    if (pack.datasetVersion !== geoDataset.version) {
      throw new Error(
        `Städtepaket ${pack.datasetVersion} passt nicht zu ${geoDataset.version}.`
      );
    }
    return pack;
  });
  return packPromise;
}

export function loadDatasetWithRankedCities() {
  datasetPromise ??= loadRankedCityPack().then((pack) =>
    parseGeoDataset({
      ...geoDataset,
      sources: [...geoDataset.sources, ...pack.sources],
      entities: [...geoDataset.entities, ...pack.entities],
      names: [...geoDataset.names, ...pack.names],
      relations: [...geoDataset.relations, ...pack.relations],
      factDefinitions: [
        ...geoDataset.factDefinitions,
        ...pack.factDefinitions
      ],
      facts: [...geoDataset.facts, ...pack.facts]
    })
  );
  return datasetPromise;
}

export function rankedCityCount(
  scopeId: keyof typeof rankedCityIndex.quality.scopeCounts,
  setSize: RankedCitySetSize
) {
  return Math.min(
    setSize,
    rankedCityIndex.quality.scopeCounts[scopeId]
  );
}
