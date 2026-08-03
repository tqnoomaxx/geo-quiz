import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";
import { Search } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import {
  loadRankedCityPack,
  type RankedCitySetSize
} from "../../content/rankedCities";
import type { RankedCityContentPack } from "../../content/schema";
import type { MvpRegionId } from "../../engine/quiz/presets";
import { MapPreview } from "../../geo/GeoMap";

interface CityExplorerProps {
  regionId: MvpRegionId;
  setSize: RankedCitySetSize;
}

function searchKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("de")
    .trim();
}

export default function CityExplorer({
  regionId,
  setSize
}: CityExplorerProps) {
  const [pack, setPack] = useState<RankedCityContentPack>();
  const [loadError, setLoadError] = useState<string>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;
    void loadRankedCityPack()
      .then((loaded) => {
        if (!cancelled) setPack(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Das Städtepaket konnte nicht geladen werden.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!pack) return undefined;
    const namesByEntity = new Map<string, string[]>();
    const displayNameByEntity = new Map<string, string>();
    for (const name of pack.names) {
      const current = namesByEntity.get(name.entityId) ?? [];
      current.push(searchKey(name.name));
      namesByEntity.set(name.entityId, current);
      if (name.kind === "preferred") {
        displayNameByEntity.set(name.entityId, name.name);
      }
    }
    const populationByEntity = new Map(
      pack.facts.map((fact) => [fact.entityId, Number(fact.value)])
    );
    const cities = pack.entities
      .filter((entity) => (entity.rankByScope?.[regionId] ?? Infinity) <= setSize)
      .map((entity) => ({
        entity,
        label: displayNameByEntity.get(entity.id) ?? entity.id,
        names: namesByEntity.get(entity.id) ?? [],
        rank: entity.rankByScope?.[regionId] ?? setSize,
        population: populationByEntity.get(entity.id) ?? 0
      }))
      .sort((left, right) => left.rank - right.rank);
    const points: FeatureCollection<
      Point,
      {
        entityId: string;
        label: string;
        rank: number;
        population: number;
        countryCode: string;
      }
    > = {
      type: "FeatureCollection",
      features: cities.map((city) => ({
        type: "Feature",
        id: city.entity.id,
        properties: {
          entityId: city.entity.id,
          label: city.label,
          rank: city.rank,
          population: city.population,
          countryCode: city.entity.promptQualifier ?? ""
        },
        geometry: {
          type: "Point",
          coordinates: city.entity.centroid
            ? [...city.entity.centroid]
            : [0, 0]
        }
      }))
    };
    return { cities, points };
  }, [pack, regionId, setSize]);

  const results = useMemo(() => {
    const normalizedQuery = searchKey(deferredQuery);
    if (!view || normalizedQuery.length < 2) return [];
    return view.cities
      .filter((city) =>
        city.names.some((name) => name.includes(normalizedQuery))
      )
      .slice(0, 6);
  }, [deferredQuery, view]);

  if (loadError) {
    return <div className="map-skeleton">{loadError}</div>;
  }
  if (!view) {
    return <div className="map-skeleton">Städte werden nachgeladen …</div>;
  }

  return (
    <div className="city-explorer">
      <div className="city-search">
        <label htmlFor="city-search-input">Stadt im Set suchen</label>
        <span className="city-search__input">
          <Search aria-hidden="true" />
          <input
            id="city-search-input"
            type="search"
            value={query}
            placeholder="z. B. München"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
        {deferredQuery.trim().length >= 2 ? (
          <div className="city-search__results" aria-live="polite">
            {results.length > 0 ? (
              results.map((city) => (
                <span key={city.entity.id}>
                  <strong>{city.label}</strong>
                  <small>
                    {city.entity.promptQualifier} · Rang {city.rank} ·{" "}
                    {city.population.toLocaleString("de-DE")}
                  </small>
                </span>
              ))
            ) : (
              <span>
                <small>Keine Stadt in diesem Topset gefunden.</small>
              </span>
            )}
          </div>
        ) : null}
      </div>
      <MapPreview
        regionId={regionId}
        previewPoints={view.points}
      />
    </div>
  );
}
