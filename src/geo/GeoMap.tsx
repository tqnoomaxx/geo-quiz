import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type StyleSpecification
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  FeatureCollection,
  MultiLineString,
  Point
} from "geojson";
import type { Coordinates } from "../engine/graders/geo";
import type { MvpRegionId } from "../engine/quiz/presets";
import { pickNearestLine } from "./lineHit";
import {
  emptyPhysicalGeoJson,
  loadPhysicalGeoJson,
  type PhysicalFeatureCollection,
  type PhysicalEntityType
} from "./physical";
import { countriesGeoJson, smallCountryMarkers } from "./world";

export type AreaSelection = {
  areaId?: string;
  label?: string;
};

export type LineSelection = {
  lineId?: string;
  label?: string;
};

interface GeoMapProps {
  mode?: "preview" | "point" | "area" | "line" | "highlight";
  regionId?: MvpRegionId;
  physicalEntityType?: PhysicalEntityType;
  selectedCoordinates?: Coordinates;
  targetCoordinates?: Coordinates;
  selectedAreaId?: string;
  targetAreaId?: string;
  selectedLineId?: string;
  targetLineId?: string;
  revealAnswer?: boolean;
  previewPoints?: FeatureCollection<
    Point,
    {
      entityId: string;
      label: string;
      rank: number;
      population: number;
      countryCode: string;
    }
  >;
  onPointSelect?: (coordinates: Coordinates) => void;
  onAreaSelect?: (selection: AreaSelection) => void;
  onLineSelect?: (selection: LineSelection) => void;
  onSelectionHint?: (message?: string) => void;
}

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: []
};

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "ocean",
      type: "background",
      paint: { "background-color": "#dceff7" }
    }
  ]
};

const REGION_CAMERAS: Record<
  MvpRegionId,
  { center: [number, number]; desktopZoom: number; mobileZoom: number }
> = {
  world: { center: [8, 18], desktopZoom: 0.7, mobileZoom: -0.45 },
  "continent:africa": {
    center: [20, 2],
    desktopZoom: 1.65,
    mobileZoom: 1.05
  },
  "continent:asia": {
    center: [88, 30],
    desktopZoom: 1.45,
    mobileZoom: 0.85
  },
  "continent:europe": {
    center: [12, 50],
    desktopZoom: 2.55,
    mobileZoom: 1.9
  },
  "continent:north-america": {
    center: [-96, 30],
    desktopZoom: 1.35,
    mobileZoom: 0.75
  },
  "continent:oceania": {
    center: [152, -15],
    desktopZoom: 1.25,
    mobileZoom: 0.65
  },
  "continent:south-america": {
    center: [-61, -17],
    desktopZoom: 1.6,
    mobileZoom: 1
  }
};

function pointCollection(
  selectedCoordinates?: Coordinates,
  targetCoordinates?: Coordinates,
  revealAnswer = false
): FeatureCollection<Point, { kind: "selected" | "target" }> {
  const features: FeatureCollection<
    Point,
    { kind: "selected" | "target" }
  >["features"] = [];

  if (selectedCoordinates) {
    features.push({
      type: "Feature",
      properties: { kind: "selected" },
      geometry: { type: "Point", coordinates: [...selectedCoordinates] }
    });
  }
  if (revealAnswer && targetCoordinates) {
    features.push({
      type: "Feature",
      properties: { kind: "target" },
      geometry: { type: "Point", coordinates: [...targetCoordinates] }
    });
  }

  return { type: "FeatureCollection", features };
}

export function GeoMap({
  mode = "preview",
  regionId = "world",
  physicalEntityType,
  selectedCoordinates,
  targetCoordinates,
  selectedAreaId,
  targetAreaId,
  selectedLineId,
  targetLineId,
  revealAnswer = false,
  previewPoints,
  onPointSelect,
  onAreaSelect,
  onLineSelect,
  onSelectionHint
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const physicalDataRef = useRef<PhysicalFeatureCollection>(
    emptyPhysicalGeoJson
  );
  const callbacksRef = useRef({
    onPointSelect,
    onAreaSelect,
    onLineSelect,
    onSelectionHint,
    mode,
    physicalEntityType
  });
  const visualStateRef = useRef({
    selectedCoordinates,
    targetCoordinates,
    selectedAreaId,
    targetAreaId,
    selectedLineId,
    targetLineId,
    revealAnswer
  });

  callbacksRef.current = {
    onPointSelect,
    onAreaSelect,
    onLineSelect,
    onSelectionHint,
    mode,
    physicalEntityType
  };
  visualStateRef.current = {
    selectedCoordinates,
    targetCoordinates,
    selectedAreaId,
    targetAreaId,
    selectedLineId,
    targetLineId,
    revealAnswer
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const isPreview = mode === "preview";
    const isMobile = containerRef.current.clientWidth < 600;
    const camera = REGION_CAMERAS[regionId];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center:
        mode === "highlight" && selectedCoordinates
          ? [...selectedCoordinates]
          : camera.center,
      zoom: isPreview
        ? regionId === "world"
          ? 0.75
          : camera.desktopZoom
        : isMobile
          ? camera.mobileZoom
          : camera.desktopZoom,
      minZoom: regionId === "world" ? -0.6 : 0.5,
      maxZoom: 8,
      dragPan: !isPreview,
      scrollZoom: !isPreview,
      boxZoom: !isPreview,
      doubleClickZoom: !isPreview,
      keyboard: !isPreview,
      touchZoomRotate: !isPreview,
      renderWorldCopies: false,
      attributionControl: false
    });

    mapRef.current = map;

    const syncCameraMetadata = () => {
      if (!containerRef.current) return;
      const center = map.getCenter();
      containerRef.current.dataset.mapCenterLongitude = String(center.lng);
      containerRef.current.dataset.mapCenterLatitude = String(center.lat);
      containerRef.current.dataset.mapZoom = String(map.getZoom());
    };

    syncCameraMetadata();
    map.on("moveend", syncCameraMetadata);

    if (!isPreview) {
      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          visualizePitch: false
        }),
        "top-left"
      );
    }
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Natural Earth"
      }),
      "bottom-right"
    );

    map.on("load", () => {
      map.addSource("countries", { type: "geojson", data: countriesGeoJson });
      map.addSource("small-country-markers", {
        type: "geojson",
        data: smallCountryMarkers
      });
      map.addSource("physical-lines", {
        type: "geojson",
        data: emptyPhysicalGeoJson
      });
      map.addSource("physical-areas", {
        type: "geojson",
        data: emptyPhysicalGeoJson
      });
      map.addSource("answer-points", {
        type: "geojson",
        data: EMPTY_POINTS
      });
      map.addSource("city-preview", {
        type: "geojson",
        data: previewPoints ?? EMPTY_POINTS,
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 34
      });

      map.addLayer({
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: { "fill-color": "#cfddc7", "fill-opacity": 1 }
      });
      map.addLayer({
        id: "countries-selected",
        type: "fill",
        source: "countries",
        filter: ["==", ["get", "entityId"], ""],
        paint: { "fill-color": "#087680", "fill-opacity": 0.78 }
      });
      map.addLayer({
        id: "countries-target",
        type: "fill",
        source: "countries",
        filter: ["==", ["get", "entityId"], ""],
        paint: { "fill-color": "#2f7d5b", "fill-opacity": 0.9 }
      });
      map.addLayer({
        id: "countries-outline",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "#ffffff",
          "line-width": isPreview ? 0.55 : 1,
          "line-opacity": 0.95
        }
      });
      map.addLayer({
        id: "physical-seas",
        type: "fill",
        source: "physical-areas",
        filter: ["==", ["get", "entityType"], "sea"],
        paint: {
          "fill-color": "#9dcddd",
          "fill-opacity": physicalEntityType === "sea" ? 0.42 : 0.12,
          "fill-outline-color": "#7fb7ca"
        }
      });
      map.addLayer({
        id: "physical-lakes",
        type: "fill",
        source: "physical-areas",
        filter: ["==", ["get", "entityType"], "lake"],
        paint: {
          "fill-color": "#83bed2",
          "fill-opacity": 0.72,
          "fill-outline-color": "#ffffff"
        }
      });
      map.addLayer({
        id: "physical-mountain-ranges",
        type: "fill",
        source: "physical-areas",
        filter: ["==", ["get", "entityType"], "mountain_range"],
        paint: {
          "fill-color": "#b99f7b",
          "fill-opacity": physicalEntityType === "mountain_range" ? 0.38 : 0.16,
          "fill-outline-color": "#9c835f"
        }
      });
      map.addLayer({
        id: "physical-rivers",
        type: "line",
        source: "physical-lines",
        filter: ["==", ["get", "entityType"], "river"],
        paint: {
          "line-color": "#4f9cba",
          "line-width": isPreview ? 0.8 : 1.6,
          "line-opacity": 0.9
        }
      });
      map.addLayer({
        id: "physical-area-selected",
        type: "fill",
        source: "physical-areas",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "fill-color": "#087680",
          "fill-opacity": 0.72,
          "fill-outline-color": "#ffffff"
        }
      });
      map.addLayer({
        id: "physical-area-target",
        type: "fill",
        source: "physical-areas",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "fill-color": "#2f7d5b",
          "fill-opacity": 0.78,
          "fill-outline-color": "#ffffff"
        }
      });
      map.addLayer({
        id: "physical-line-selected",
        type: "line",
        source: "physical-lines",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "line-color": "#087680",
          "line-width": 5,
          "line-opacity": 1
        }
      });
      map.addLayer({
        id: "physical-line-target",
        type: "line",
        source: "physical-lines",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "line-color": "#2f7d5b",
          "line-width": 5,
          "line-opacity": 1
        }
      });
      map.addLayer({
        id: "physical-area-hit",
        type: "fill",
        source: "physical-areas",
        filter: [
          "==",
          ["get", "entityType"],
          physicalEntityType ?? "__none__"
        ],
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0
        }
      });
      map.addLayer({
        id: "small-country-markers-visible",
        type: "circle",
        source: "small-country-markers",
        ...(physicalEntityType || previewPoints
          ? { filter: ["==", ["get", "entityId"], "__none__"] }
          : {}),
        paint: {
          "circle-color": "#b7c9ae",
          "circle-radius": isPreview ? 1.75 : 3,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1
        }
      });
      map.addLayer({
        id: "small-country-markers-selected",
        type: "circle",
        source: "small-country-markers",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "circle-color": "#087680",
          "circle-radius": 6,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "small-country-markers-target",
        type: "circle",
        source: "small-country-markers",
        filter: ["==", ["get", "entityId"], ""],
        paint: {
          "circle-color": "#2f7d5b",
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "small-country-markers-hit",
        type: "circle",
        source: "small-country-markers",
        paint: {
          "circle-color": "#000000",
          "circle-radius": 14,
          "circle-opacity": 0
        }
      });
      map.addLayer({
        id: "city-preview-clusters",
        type: "circle",
        source: "city-preview",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#087680",
          "circle-opacity": 0.82,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            12,
            20,
            16,
            75,
            20
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5
        }
      });
      map.addLayer({
        id: "city-preview-cluster-count",
        type: "symbol",
        source: "city-preview",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 10
        },
        paint: { "text-color": "#ffffff" }
      });
      map.addLayer({
        id: "city-preview-points",
        type: "circle",
        source: "city-preview",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#315b52",
          "circle-radius": 3.25,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1
        }
      });
      map.addLayer({
        id: "answer-points-selected",
        type: "circle",
        source: "answer-points",
        filter: ["==", ["get", "kind"], "selected"],
        paint: {
          "circle-color": mode === "highlight" ? "#087680" : "#d73543",
          "circle-radius": mode === "highlight" ? 8 : 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "answer-points-target",
        type: "circle",
        source: "answer-points",
        filter: ["==", ["get", "kind"], "target"],
        paint: {
          "circle-color": "#2f7d5b",
          "circle-radius": 8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3
        }
      });

      const visual = visualStateRef.current;
      map.setFilter("countries-selected", [
        "==",
        ["get", "entityId"],
        visual.selectedAreaId ?? ""
      ]);
      map.setFilter("countries-target", [
        "==",
        ["get", "entityId"],
        visual.revealAnswer ? (visual.targetAreaId ?? "") : ""
      ]);
      map.setFilter("small-country-markers-selected", [
        "==",
        ["get", "entityId"],
        visual.selectedAreaId ?? ""
      ]);
      map.setFilter("small-country-markers-target", [
        "==",
        ["get", "entityId"],
        visual.revealAnswer ? (visual.targetAreaId ?? "") : ""
      ]);
      map.setFilter("physical-area-selected", [
        "==",
        ["get", "entityId"],
        visual.selectedAreaId ?? ""
      ]);
      map.setFilter("physical-area-target", [
        "==",
        ["get", "entityId"],
        visual.revealAnswer ? (visual.targetAreaId ?? "") : ""
      ]);
      map.setFilter("physical-line-selected", [
        "==",
        ["get", "entityId"],
        visual.selectedLineId ?? ""
      ]);
      map.setFilter("physical-line-target", [
        "==",
        ["get", "entityId"],
        visual.revealAnswer ? (visual.targetLineId ?? "") : ""
      ]);
      (map.getSource("answer-points") as GeoJSONSource).setData(
        pointCollection(
          visual.selectedCoordinates,
          visual.targetCoordinates,
          visual.revealAnswer
        )
      );

      if (physicalEntityType) {
        if (containerRef.current) {
          containerRef.current.dataset.physicalReady = "false";
        }
        void loadPhysicalGeoJson(physicalEntityType).then((collection) => {
          if (mapRef.current !== map) return;
          physicalDataRef.current = collection;
          const sourceId =
            physicalEntityType === "river"
              ? "physical-lines"
              : "physical-areas";
          (map.getSource(sourceId) as GeoJSONSource).setData(collection);
          if (containerRef.current) {
            containerRef.current.dataset.physicalReady = "true";
          }
        });
      } else {
        physicalDataRef.current = emptyPhysicalGeoJson;
        if (containerRef.current) {
          containerRef.current.dataset.physicalReady = "true";
        }
      }

      if (
        mode === "highlight" &&
        visual.selectedCoordinates &&
        !visual.selectedAreaId
      ) {
        const markerElement = document.createElement("span");
        markerElement.className = "geo-map-highlight-marker";
        markerElement.setAttribute("aria-hidden", "true");
        new maplibregl.Marker({ element: markerElement })
          .setLngLat([...visual.selectedCoordinates])
          .addTo(map);
      }
    });

    const handleClick = (event: MapMouseEvent) => {
      const current = callbacksRef.current;

      if (current.mode === "point" && current.onPointSelect) {
        current.onPointSelect([event.lngLat.lng, event.lngLat.lat]);
        return;
      }
      if (current.mode === "line" && current.onLineSelect) {
        const candidates = physicalDataRef.current.features
          .filter(
            (
              feature
            ): feature is typeof feature & { geometry: MultiLineString } =>
              feature.properties?.entityType === current.physicalEntityType &&
              feature.geometry.type === "MultiLineString"
          )
          .map((feature) => ({
            id: feature.properties.entityId,
            label: feature.properties.label,
            lines: feature.geometry.coordinates.map((line) =>
              line.map(([longitude, latitude]) => {
                const projected = map.project([longitude, latitude]);
                return { x: projected.x, y: projected.y };
              })
            )
          }));
        const selection = pickNearestLine(
          { x: event.point.x, y: event.point.y },
          candidates,
          isMobile ? 18 : 12,
          3
        );
        if (selection.kind === "selected") {
          current.onSelectionHint?.();
          current.onLineSelect({
            lineId: selection.id,
            label: selection.label
          });
        } else if (selection.kind === "ambiguous") {
          current.onSelectionHint?.(
            "Mehrere Flüsse liegen hier nah beieinander. Zoome näher heran."
          );
        } else {
          current.onSelectionHint?.(
            "Hier wurde kein Fluss getroffen. Zoome näher heran und versuche es erneut."
          );
        }
        return;
      }
      if (current.mode === "area" && current.onAreaSelect) {
        const isPhysicalArea =
          current.physicalEntityType === "lake" ||
          current.physicalEntityType === "sea" ||
          current.physicalEntityType === "mountain_range";
        const [marker] = isPhysicalArea
          ? []
          : map.queryRenderedFeatures(event.point, {
              layers: ["small-country-markers-hit"]
            });
        const [area] = map.queryRenderedFeatures(event.point, {
          layers: [isPhysicalArea ? "physical-area-hit" : "countries-fill"]
        });
        const selected = marker ?? area;
        current.onAreaSelect({
          areaId:
            typeof selected?.properties?.entityId === "string"
              ? selected.properties.entityId
              : undefined,
          label:
            typeof selected?.properties?.label === "string"
              ? selected.properties.label
              : undefined
        });
      }
    };

    map.on("click", handleClick);
    map.getCanvas().style.cursor =
      mode === "point"
        ? "crosshair"
        : mode === "area" || mode === "line"
          ? "pointer"
          : "grab";

    return () => {
      map.off("click", handleClick);
      map.off("moveend", syncCameraMetadata);
      map.remove();
      mapRef.current = null;
    };
  }, [mode, physicalEntityType, previewPoints, regionId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    for (const layer of ["countries-selected", "small-country-markers-selected"]) {
      map.setFilter(layer, [
        "==",
        ["get", "entityId"],
        selectedAreaId ?? ""
      ]);
    }
    for (const layer of ["countries-target", "small-country-markers-target"]) {
      map.setFilter(layer, [
        "==",
        ["get", "entityId"],
        revealAnswer ? (targetAreaId ?? "") : ""
      ]);
    }
    map.setFilter("physical-area-selected", [
      "==",
      ["get", "entityId"],
      selectedAreaId ?? ""
    ]);
    map.setFilter("physical-area-target", [
      "==",
      ["get", "entityId"],
      revealAnswer ? (targetAreaId ?? "") : ""
    ]);
    map.setFilter("physical-line-selected", [
      "==",
      ["get", "entityId"],
      selectedLineId ?? ""
    ]);
    map.setFilter("physical-line-target", [
      "==",
      ["get", "entityId"],
      revealAnswer ? (targetLineId ?? "") : ""
    ]);
    (map.getSource("answer-points") as GeoJSONSource | undefined)?.setData(
      pointCollection(selectedCoordinates, targetCoordinates, revealAnswer)
    );
    if (previewPoints) {
      (map.getSource("city-preview") as GeoJSONSource | undefined)?.setData(
        previewPoints
      );
    }
  }, [
    revealAnswer,
    selectedAreaId,
    selectedCoordinates,
    selectedLineId,
    targetAreaId,
    targetCoordinates,
    targetLineId,
    previewPoints
  ]);

  return (
    <div
      ref={containerRef}
      className="geo-map"
      data-region-id={regionId}
      data-physical-ready={physicalEntityType ? "false" : "true"}
      data-city-points={previewPoints?.features.length ?? 0}
      aria-label={
        mode === "preview"
          ? `${regionId === "world" ? "Weltkarte" : "Regionalkarte"} als Vorschau`
          : "Interaktive Karte für die aktuelle Quizfrage"
      }
    />
  );
}

export function MapPreview({
  regionId = "world",
  physicalEntityType,
  previewPoints
}: {
  regionId?: MvpRegionId;
  physicalEntityType?: PhysicalEntityType;
  previewPoints?: GeoMapProps["previewPoints"];
}) {
  return (
    <GeoMap
      mode="preview"
      regionId={regionId}
      physicalEntityType={physicalEntityType}
      previewPoints={previewPoints}
    />
  );
}
