export type ScreenPoint = { x: number; y: number };

export type ScreenLineCandidate = {
  id: string;
  label: string;
  lines: readonly (readonly ScreenPoint[])[];
};

export type LinePickResult =
  | { kind: "none" }
  | { kind: "ambiguous"; candidateIds: [string, string] }
  | { kind: "selected"; id: string; label: string; distancePx: number };

export function distanceToSegment(
  point: ScreenPoint,
  from: ScreenPoint,
  to: ScreenPoint
) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }
  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * deltaX + (point.y - from.y) * deltaY) /
        lengthSquared
    )
  );
  return Math.hypot(
    point.x - (from.x + progress * deltaX),
    point.y - (from.y + progress * deltaY)
  );
}

function distanceToLine(
  point: ScreenPoint,
  lines: ScreenLineCandidate["lines"]
) {
  let nearest = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      nearest = Math.min(
        nearest,
        distanceToSegment(point, line[index - 1], line[index])
      );
    }
  }
  return nearest;
}

export function pickNearestLine(
  point: ScreenPoint,
  candidates: readonly ScreenLineCandidate[],
  maximumDistancePx: number,
  ambiguityDifferencePx = 3
): LinePickResult {
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      distancePx: distanceToLine(point, candidate.lines)
    }))
    .filter((candidate) => candidate.distancePx <= maximumDistancePx)
    .sort(
      (left, right) =>
        left.distancePx - right.distancePx || left.id.localeCompare(right.id)
    );
  const first = ranked[0];
  if (!first) return { kind: "none" };
  const second = ranked[1];
  if (
    second &&
    second.distancePx - first.distancePx <= ambiguityDifferencePx
  ) {
    return {
      kind: "ambiguous",
      candidateIds: [first.id, second.id]
    };
  }
  return {
    kind: "selected",
    id: first.id,
    label: first.label,
    distancePx: first.distancePx
  };
}
