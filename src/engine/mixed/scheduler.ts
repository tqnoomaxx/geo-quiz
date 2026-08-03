import type { ContentRepository } from "../../content/repository";
import { createSeededRandom } from "../random/seeded";
import {
  type MixedQuizDefinition,
  type MixedQuizPool,
  type QuizRoundDefinition,
  isMixedQuizDefinition
} from "../quiz/definition";
import { generateQuestions } from "../quiz/generator";
import type { QuestionInstance } from "../quiz/question";

type PoolAllocation = {
  pool: MixedQuizPool;
  count: number;
};

function rebalanceForConsecutiveLimit(
  allocations: PoolAllocation[],
  maxConsecutiveFromPool: number
) {
  const total = allocations.reduce((sum, allocation) => sum + allocation.count, 0);

  while (true) {
    const overfull = allocations.find(
      (allocation) =>
        allocation.count >
        maxConsecutiveFromPool * (total - allocation.count + 1)
    );
    if (!overfull) return;

    const recipient = allocations
      .filter(
        (allocation) =>
          allocation.pool.id !== overfull.pool.id &&
          allocation.count < allocation.pool.maximum
      )
      .sort(
        (left, right) =>
          left.count - right.count ||
          left.pool.id.localeCompare(right.pool.id)
      )[0];

    if (overfull.count <= overfull.pool.minimum || !recipient) {
      throw new Error(
        `${overfull.pool.id}: Poolgrenzen sind mit maxConsecutiveFromPool=${maxConsecutiveFromPool} nicht planbar.`
      );
    }
    overfull.count -= 1;
    recipient.count += 1;
  }
}

function weightedPick(
  allocations: readonly PoolAllocation[],
  random: () => number
) {
  const totalWeight = allocations.reduce(
    (sum, allocation) => sum + allocation.pool.weight,
    0
  );
  let cursor = random() * totalWeight;

  for (const allocation of allocations) {
    cursor -= allocation.pool.weight;
    if (cursor <= 0) return allocation;
  }

  return allocations.at(-1)!;
}

export function allocateMixedPools(
  definition: MixedQuizDefinition,
  seed = definition.rules.seed ?? "default"
): PoolAllocation[] {
  const questionCount = definition.rules.questionCount;
  if (questionCount === "all") {
    throw new Error(`${definition.id}: Mixed-Runden benötigen eine feste Fragenzahl.`);
  }

  const allocations = definition.pools.map((pool) => ({
    pool,
    count: pool.minimum
  }));
  let remaining =
    questionCount - allocations.reduce((sum, item) => sum + item.count, 0);
  const random = createSeededRandom(
    `${definition.datasetVersion}|${definition.id}|allocation|${seed}`
  );

  while (remaining > 0) {
    const available = allocations.filter(
      (allocation) => allocation.count < allocation.pool.maximum
    );
    if (available.length === 0) {
      throw new Error(`${definition.id}: Poolmaxima reichen für die Runde nicht aus.`);
    }
    weightedPick(available, random).count += 1;
    remaining -= 1;
  }

  rebalanceForConsecutiveLimit(
    allocations,
    definition.schedule.maxConsecutiveFromPool
  );
  return allocations;
}

function schedulePoolIds(
  definition: MixedQuizDefinition,
  allocations: readonly PoolAllocation[],
  seed: string
) {
  const remaining = new Map(
    allocations.map((allocation) => [allocation.pool.id, allocation.count])
  );
  const poolsById = new Map(
    allocations.map((allocation) => [allocation.pool.id, allocation.pool])
  );
  const random = createSeededRandom(
    `${definition.datasetVersion}|${definition.id}|schedule|${seed}`
  );
  const result: string[] = [];

  while ([...remaining.values()].some((count) => count > 0)) {
    const previous = result.at(-1);
    const consecutive = previous
      ? [...result]
          .reverse()
          .findIndex((poolId: string) => poolId !== previous)
      : 0;
    const currentRun =
      previous === undefined
        ? 0
        : consecutive === -1
          ? result.length
          : consecutive;
    const candidates = allocations
      .filter((allocation) => (remaining.get(allocation.pool.id) ?? 0) > 0)
      .filter(
        (allocation) =>
          allocation.pool.id !== previous ||
          currentRun < definition.schedule.maxConsecutiveFromPool
      );
    if (candidates.length === 0) {
      throw new Error(
        `${definition.id}: Verteilung verletzt maxConsecutiveFromPool.`
      );
    }
    const ranked = candidates
      .map((allocation) => ({
        pool: poolsById.get(allocation.pool.id)!,
        count: remaining.get(allocation.pool.id) ?? 0,
        tieBreaker: random()
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.tieBreaker - right.tieBreaker ||
          left.pool.id.localeCompare(right.pool.id)
      );
    const selected = ranked[0];
    result.push(selected.pool.id);
    remaining.set(
      selected.pool.id,
      (remaining.get(selected.pool.id) ?? 0) - 1
    );
  }

  return result;
}

export function generateMixedQuestions(
  definition: MixedQuizDefinition,
  repository: ContentRepository,
  seed = definition.rules.seed ?? "default"
): QuestionInstance[] {
  const allocations = allocateMixedPools(definition, seed);
  const questionsByPool = new Map(
    allocations.map(({ pool, count }) => {
      const poolDefinition = {
        ...pool.definition,
        rules: {
          ...pool.definition.rules,
          questionCount: count,
          seed: `${seed}:${pool.id}`
        }
      };
      const questions = generateQuestions(
        poolDefinition,
        repository,
        `${seed}:${pool.id}`
      );
      return [pool.id, questions] as const;
    })
  );
  const offsets = new Map(definition.pools.map((pool) => [pool.id, 0]));
  const schedule = schedulePoolIds(definition, allocations, seed);

  return schedule.map((poolId, ordinal) => {
    const poolQuestions = questionsByPool.get(poolId);
    const offset = offsets.get(poolId) ?? 0;
    const question = poolQuestions?.[offset];
    if (!question) {
      throw new Error(`${definition.id}: Pool ${poolId} ist vorzeitig leer.`);
    }
    offsets.set(poolId, offset + 1);

    return {
      ...question,
      id: `${definition.id}:${seed}:${ordinal + 1}:${question.subjectId}:${poolId}`,
      ordinal,
      metadata: {
        ...question.metadata,
        sourcePoolId: poolId
      }
    };
  });
}

export function generateRoundQuestions(
  definition: QuizRoundDefinition,
  repository: ContentRepository,
  seed = definition.rules.seed ?? "default"
) {
  return isMixedQuizDefinition(definition)
    ? generateMixedQuestions(definition, repository, seed)
    : generateQuestions(definition, repository, seed);
}
