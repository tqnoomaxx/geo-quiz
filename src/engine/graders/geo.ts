export type Coordinates = readonly [longitude: number, latitude: number];

export interface PointGradeResult {
  correct: boolean;
  distanceKm: number;
}

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  from: Coordinates,
  to: Coordinates
): number {
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  );
}

export function gradeMapPoint(
  input: Coordinates,
  target: Coordinates,
  thresholdKm: number
): PointGradeResult {
  const distanceKm = haversineDistanceKm(input, target);

  return {
    correct: distanceKm <= thresholdKm,
    distanceKm
  };
}
