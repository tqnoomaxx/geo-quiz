import { geoDataset } from "./dataset";
import { loadRankedCityPack } from "./rankedCities";
import { loadRankedPhysicalPack } from "./rankedPhysical";
import { parseGeoDataset, type GeoDataset } from "./schema";

let allRankedDatasetPromise: Promise<GeoDataset> | undefined;

export async function loadDatasetForRankedContent(options: {
  cities: boolean;
  physical: boolean;
}) {
  if (!options.cities && !options.physical) return geoDataset;
  if (options.cities && !options.physical) {
    const pack = await loadRankedCityPack();
    return parseGeoDataset({
      ...geoDataset,
      sources: [...geoDataset.sources, ...pack.sources],
      entities: [...geoDataset.entities, ...pack.entities],
      names: [...geoDataset.names, ...pack.names],
      relations: [...geoDataset.relations, ...pack.relations],
      factDefinitions: [...geoDataset.factDefinitions, ...pack.factDefinitions],
      facts: [...geoDataset.facts, ...pack.facts]
    });
  }
  if (!options.cities && options.physical) {
    const pack = await loadRankedPhysicalPack();
    return parseGeoDataset({
      ...geoDataset,
      sources: [...geoDataset.sources, ...pack.sources],
      entities: [...geoDataset.entities, ...pack.entities],
      names: [...geoDataset.names, ...pack.names],
      relations: [...geoDataset.relations, ...pack.relations],
      factDefinitions: [...geoDataset.factDefinitions, ...pack.factDefinitions],
      facts: [...geoDataset.facts, ...pack.facts]
    });
  }

  allRankedDatasetPromise ??= Promise.all([
    loadRankedCityPack(),
    loadRankedPhysicalPack()
  ]).then(([cities, physical]) =>
    parseGeoDataset({
      ...geoDataset,
      sources: [
        ...geoDataset.sources,
        ...cities.sources,
        ...physical.sources
      ],
      entities: [
        ...geoDataset.entities,
        ...cities.entities,
        ...physical.entities
      ],
      names: [...geoDataset.names, ...cities.names, ...physical.names],
      relations: [
        ...geoDataset.relations,
        ...cities.relations,
        ...physical.relations
      ],
      factDefinitions: [
        ...geoDataset.factDefinitions,
        ...cities.factDefinitions,
        ...physical.factDefinitions
      ],
      facts: [...geoDataset.facts, ...cities.facts, ...physical.facts]
    })
  );
  return allRankedDatasetPromise;
}
