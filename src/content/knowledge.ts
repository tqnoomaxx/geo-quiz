import type {
  CompiledKnowledgeQuestion,
  ContentEntity,
  DatasetSource,
  EntityFact,
  EntityRelation,
  FactDefinition,
  GeoDataset,
  LocalizedName
} from "./schema";

export type KnowledgeFilterExpression =
  | {
      op: "relation";
      relationType: string;
      targetId: string;
    }
  | {
      op: "entity_ids";
      ids: string[];
    }
  | {
      op: "fact";
      factTypeId: string;
      comparator: "eq" | "gt" | "gte" | "lt" | "lte";
      value: number;
    }
  | {
      op: "all";
      expressions: KnowledgeFilterExpression[];
    };

export type KnowledgeAnswerPath =
  | { from: "ranked_entity" }
  | {
      from: "ranked_entity";
      relationType: string;
      direction: "outgoing" | "incoming";
      relationLabelDe: string;
    };

export type KnowledgeQuestionTemplate = {
  id: string;
  candidateType: string;
  promptDe: string;
  filter: KnowledgeFilterExpression;
  ranking: {
    factTypeId: string;
    order: "ascending" | "descending";
    rank: number;
  };
  answer: KnowledgeAnswerPath;
  difficulty: number;
};

export type RawKnowledgeSnapshot = {
  schemaVersion: 1;
  datasetVersion: string;
  builtAt: string;
  sources: DatasetSource[];
  factDefinitions: FactDefinition[];
  facts: EntityFact[];
  relationClaims: EntityRelation[];
};

export type RawKnowledgeTemplateSnapshot = {
  schemaVersion: 1;
  datasetVersion: string;
  templates: KnowledgeQuestionTemplate[];
};

type CompilerDataset = Pick<
  GeoDataset,
  "entities" | "names" | "relations" | "factDefinitions" | "facts" | "sources"
>;

export type CompiledKnowledgeContent = {
  questions: CompiledKnowledgeQuestion[];
  entities: ContentEntity[];
  names: LocalizedName[];
  answerRelations: EntityRelation[];
  scopeRelations: EntityRelation[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} muss ein nichtleerer String sein.`);
  }
}

function validateFilter(
  value: unknown,
  path: string
): asserts value is KnowledgeFilterExpression {
  if (!isRecord(value)) {
    throw new Error(`${path} muss ein Objekt sein.`);
  }

  if (value.op === "relation") {
    assertString(value.relationType, `${path}.relationType`);
    assertString(value.targetId, `${path}.targetId`);
    return;
  }
  if (value.op === "entity_ids") {
    if (
      !Array.isArray(value.ids) ||
      value.ids.length === 0 ||
      value.ids.some((id) => typeof id !== "string")
    ) {
      throw new Error(`${path}.ids muss ein nichtleeres String-Array sein.`);
    }
    return;
  }
  if (value.op === "fact") {
    assertString(value.factTypeId, `${path}.factTypeId`);
    if (
      !["eq", "gt", "gte", "lt", "lte"].includes(String(value.comparator)) ||
      typeof value.value !== "number" ||
      !Number.isFinite(value.value)
    ) {
      throw new Error(`${path} besitzt keinen sicheren Faktenvergleich.`);
    }
    return;
  }
  if (value.op === "all") {
    if (!Array.isArray(value.expressions) || value.expressions.length < 2) {
      throw new Error(`${path}.expressions benötigt mindestens zwei Filter.`);
    }
    value.expressions.forEach((expression, index) =>
      validateFilter(expression, `${path}.expressions[${index}]`)
    );
    return;
  }

  throw new Error(`${path}.op ist nicht erlaubt.`);
}

export function parseRawKnowledgeSnapshot(
  value: unknown
): RawKnowledgeSnapshot {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.datasetVersion !== "string" ||
    typeof value.builtAt !== "string" ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.factDefinitions) ||
    !Array.isArray(value.facts) ||
    !Array.isArray(value.relationClaims)
  ) {
    throw new Error("Knowledge Snapshot-Kopf ist ungültig.");
  }
  return value as unknown as RawKnowledgeSnapshot;
}

export function parseRawKnowledgeTemplateSnapshot(
  value: unknown
): RawKnowledgeTemplateSnapshot {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.datasetVersion !== "string" ||
    !Array.isArray(value.templates) ||
    value.templates.length === 0
  ) {
    throw new Error("Knowledge Template Snapshot ist ungültig.");
  }

  const ids = new Set<string>();
  value.templates.forEach((template, index) => {
    const path = `templates[${index}]`;
    if (!isRecord(template)) {
      throw new Error(`${path} muss ein Objekt sein.`);
    }
    assertString(template.id, `${path}.id`);
    if (ids.has(template.id)) {
      throw new Error(`Doppelte Wissensvorlage: ${template.id}`);
    }
    ids.add(template.id);
    assertString(template.candidateType, `${path}.candidateType`);
    assertString(template.promptDe, `${path}.promptDe`);
    validateFilter(template.filter, `${path}.filter`);
    if (
      !isRecord(template.ranking) ||
      typeof template.ranking.factTypeId !== "string" ||
      !["ascending", "descending"].includes(String(template.ranking.order)) ||
      !Number.isInteger(template.ranking.rank) ||
      Number(template.ranking.rank) < 1
    ) {
      throw new Error(`${path}.ranking ist ungültig.`);
    }
    if (
      !isRecord(template.answer) ||
      template.answer.from !== "ranked_entity"
    ) {
      throw new Error(`${path}.answer ist ungültig.`);
    }
    if (
      template.answer.relationType !== undefined &&
      (typeof template.answer.relationType !== "string" ||
        (template.answer.direction !== "outgoing" &&
          template.answer.direction !== "incoming") ||
        typeof template.answer.relationLabelDe !== "string")
    ) {
      throw new Error(`${path}.answer besitzt einen ungültigen Relationspfad.`);
    }
    if (
      !Number.isInteger(template.difficulty) ||
      Number(template.difficulty) < 1 ||
      Number(template.difficulty) > 5
    ) {
      throw new Error(`${path}.difficulty muss zwischen 1 und 5 liegen.`);
    }
  });

  return value as unknown as RawKnowledgeTemplateSnapshot;
}

function preferredName(
  entityId: string,
  names: readonly LocalizedName[]
): string {
  return (
    names.find(
      (name) =>
        name.entityId === entityId &&
        name.locale === "de" &&
        name.kind === "preferred"
    )?.name ?? entityId
  );
}

function relationForExpression(
  entityId: string,
  expression: Extract<KnowledgeFilterExpression, { op: "relation" }>,
  relations: readonly EntityRelation[]
) {
  return relations.find(
    (relation) =>
      relation.sourceId === entityId &&
      relation.relationType === expression.relationType &&
      relation.targetId === expression.targetId
  );
}

function numericFact(
  entityId: string,
  factTypeId: string,
  facts: readonly EntityFact[]
) {
  const matches = facts.filter(
    (fact) =>
      fact.entityId === entityId && fact.factTypeId === factTypeId
  );
  if (matches.length !== 1 || typeof matches[0].value !== "number") {
    return undefined;
  }
  return matches[0] as EntityFact & { value: number };
}

function matchesFilter(
  entityId: string,
  expression: KnowledgeFilterExpression,
  dataset: CompilerDataset
): boolean {
  if (expression.op === "relation") {
    return Boolean(relationForExpression(entityId, expression, dataset.relations));
  }
  if (expression.op === "entity_ids") {
    return expression.ids.includes(entityId);
  }
  if (expression.op === "all") {
    return expression.expressions.every((nested) =>
      matchesFilter(entityId, nested, dataset)
    );
  }

  const fact = numericFact(entityId, expression.factTypeId, dataset.facts);
  if (!fact) return false;
  if (expression.comparator === "eq") return fact.value === expression.value;
  if (expression.comparator === "gt") return fact.value > expression.value;
  if (expression.comparator === "gte") return fact.value >= expression.value;
  if (expression.comparator === "lt") return fact.value < expression.value;
  return fact.value <= expression.value;
}

function matchesStructuralFilter(
  entityId: string,
  expression: KnowledgeFilterExpression,
  dataset: CompilerDataset
): boolean {
  if (expression.op === "fact") return true;
  if (expression.op === "all") {
    return expression.expressions.every((nested) =>
      matchesStructuralFilter(entityId, nested, dataset)
    );
  }
  return matchesFilter(entityId, expression, dataset);
}

function collectFactFilters(
  expression: KnowledgeFilterExpression
): Array<Extract<KnowledgeFilterExpression, { op: "fact" }>> {
  if (expression.op === "fact") return [expression];
  if (expression.op === "all") {
    return expression.expressions.flatMap(collectFactFilters);
  }
  return [];
}

function collectFilterRelations(
  entityId: string,
  expression: KnowledgeFilterExpression,
  relations: readonly EntityRelation[]
): EntityRelation[] {
  if (expression.op === "relation") {
    const relation = relationForExpression(entityId, expression, relations);
    return relation ? [relation] : [];
  }
  if (expression.op === "all") {
    return expression.expressions.flatMap((nested) =>
      collectFilterRelations(entityId, nested, relations)
    );
  }
  return [];
}

function collectFilterFacts(
  entityId: string,
  expression: KnowledgeFilterExpression,
  facts: readonly EntityFact[]
): EntityFact[] {
  if (expression.op === "fact") {
    const fact = numericFact(entityId, expression.factTypeId, facts);
    return fact ? [fact] : [];
  }
  if (expression.op === "all") {
    return expression.expressions.flatMap((nested) =>
      collectFilterFacts(entityId, nested, facts)
    );
  }
  return [];
}

function comparableSignature(fact: EntityFact) {
  return [
    fact.factTypeId,
    fact.asOf,
    fact.method,
    [...fact.sourceRefs].sort().join(",")
  ].join("|");
}

function formatFactValue(value: number, unit?: string) {
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function resolveAnswer(
  rankedEntity: ContentEntity,
  answer: KnowledgeAnswerPath,
  dataset: CompilerDataset,
  templateId: string
) {
  if (!("relationType" in answer)) {
    return { entity: rankedEntity, relation: undefined };
  }

  const matches = dataset.relations.filter((relation) => {
    if (relation.relationType !== answer.relationType) return false;
    return answer.direction === "outgoing"
      ? relation.sourceId === rankedEntity.id
      : relation.targetId === rankedEntity.id;
  });
  if (matches.length !== 1) {
    throw new Error(
      `${templateId}: Antwortpfad ${answer.relationType} löst ${matches.length} statt genau einer Relation auf.`
    );
  }
  const answerId =
    answer.direction === "outgoing" ? matches[0].targetId : matches[0].sourceId;
  const entity = dataset.entities.find((candidate) => candidate.id === answerId);
  if (!entity) {
    throw new Error(`${templateId}: Antwortpfad endet bei unbekannter Entität.`);
  }
  return { entity, relation: matches[0] };
}

export function compileKnowledgeQuestions(
  templates: readonly KnowledgeQuestionTemplate[],
  dataset: CompilerDataset
): CompiledKnowledgeContent {
  const sourceIds = new Set(dataset.sources.map((source) => source.id));
  const factDefinitions = new Map(
    dataset.factDefinitions.map((definition) => [definition.id, definition])
  );
  const templateIds = new Set<string>();
  const compiled: CompiledKnowledgeQuestion[] = [];
  const entities: ContentEntity[] = [];
  const names: LocalizedName[] = [];
  const answerRelations: EntityRelation[] = [];
  const scopeRelations: EntityRelation[] = [];

  for (const template of [...templates].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    if (templateIds.has(template.id)) {
      throw new Error(`Doppelte Wissensvorlage: ${template.id}`);
    }
    templateIds.add(template.id);

    const definition = factDefinitions.get(template.ranking.factTypeId);
    if (!definition || definition.valueType !== "number") {
      throw new Error(
        `${template.id}: Ranking benötigt eine numerische Faktdefinition.`
      );
    }
    const structuralCandidates = dataset.entities
      .filter(
        (entity) =>
          entity.active &&
          entity.type === template.candidateType &&
          matchesStructuralFilter(entity.id, template.filter, dataset)
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const filter of collectFactFilters(template.filter)) {
      const filterDefinition = factDefinitions.get(filter.factTypeId);
      if (!filterDefinition || filterDefinition.valueType !== "number") {
        throw new Error(
          `${template.id}: Faktenfilter benötigt eine numerische Faktdefinition.`
        );
      }
      const filterFacts = structuralCandidates.map((entity) => {
        const fact = numericFact(entity.id, filter.factTypeId, dataset.facts);
        if (!fact) {
          throw new Error(
            `${template.id}: ${entity.id} besitzt keinen eindeutigen Filterfakt.`
          );
        }
        return fact;
      });
      if (
        new Set(filterFacts.map((fact) => comparableSignature(fact))).size !==
        1
      ) {
        throw new Error(
          `${template.id}: Faktenfilter mischt Quelle, Methode oder Bezugsdatum.`
        );
      }
    }
    const candidates = structuralCandidates.filter((entity) =>
      matchesFilter(entity.id, template.filter, dataset)
    );
    if (candidates.length < template.ranking.rank) {
      throw new Error(
        `${template.id}: ${candidates.length} Kandidaten reichen nicht für Rang ${template.ranking.rank}.`
      );
    }

    const ranked = candidates.map((entity) => {
      const fact = numericFact(
        entity.id,
        template.ranking.factTypeId,
        dataset.facts
      );
      if (!fact) {
        throw new Error(
          `${template.id}: ${entity.id} besitzt keinen eindeutigen Ranking-Fakt.`
        );
      }
      return { entity, fact };
    });
    const signatures = new Set(
      ranked.map(({ fact }) => comparableSignature(fact))
    );
    if (signatures.size !== 1) {
      throw new Error(
        `${template.id}: Ranking mischt Quelle, Methode oder Bezugsdatum.`
      );
    }
    ranked.sort((left, right) => {
      const valueComparison =
        template.ranking.order === "descending"
          ? right.fact.value - left.fact.value
          : left.fact.value - right.fact.value;
      return (
        valueComparison || left.entity.id.localeCompare(right.entity.id)
      );
    });

    const targetIndex = template.ranking.rank - 1;
    const target = ranked[targetIndex];
    if (
      ranked.some(
        (candidate, index) =>
          index !== targetIndex && candidate.fact.value === target.fact.value
      )
    ) {
      throw new Error(
        `${template.id}: Rang ${template.ranking.rank} ist wegen eines Gleichstands nicht eindeutig.`
      );
    }

    const answer = resolveAnswer(
      target.entity,
      template.answer,
      dataset,
      template.id
    );
    const questionEntityId = `knowledge:${template.id}`;
    const questionId = `compiled:${template.id}`;
    const questionSuffix = questionEntityId.replaceAll(":", "-");
    const relationId = `relation:${questionSuffix}:has-answer:${answer.entity.id.replaceAll(":", "-")}`;
    const evidenceRanked = ranked.slice(0, template.ranking.rank);
    const rankingEvidence = evidenceRanked.map(({ entity, fact }, index) => ({
      labelDe: `Rang ${index + 1} · ${preferredName(entity.id, dataset.names)}`,
      valueDe: formatFactValue(fact.value, definition.unit),
      factId: fact.id
    }));
    const filterRelations = collectFilterRelations(
      target.entity.id,
      template.filter,
      dataset.relations
    );
    const filterFacts = collectFilterFacts(
      target.entity.id,
      template.filter,
      dataset.facts
    );
    const relationEvidence = filterRelations.map((relation) => ({
      labelDe:
        relation.relationType === "has_official_language"
          ? "Amtssprache"
          : "Gebiet",
      valueDe: preferredName(relation.targetId, dataset.names),
      relationId: relation.id
    }));
    const answerEvidence = answer.relation
      ? [
          {
            labelDe: (
              template.answer as Extract<
                KnowledgeAnswerPath,
                { relationType: string }
              >
            ).relationLabelDe,
            valueDe: preferredName(answer.entity.id, dataset.names),
            relationId: answer.relation.id
          }
        ]
      : [];
    const filterFactEvidence = filterFacts
      .filter((fact) => fact.id !== target.fact.id)
      .map((fact) => {
        const filterDefinition = factDefinitions.get(fact.factTypeId);
        return {
          labelDe: filterDefinition?.labelDe ?? fact.factTypeId,
          valueDe:
            typeof fact.value === "number"
              ? formatFactValue(fact.value, filterDefinition?.unit)
              : fact.value,
          factId: fact.id
        };
      });
    const sourceRefs = [
      ...new Set([
        ...evidenceRanked.flatMap(({ fact }) => fact.sourceRefs),
        ...filterFacts.flatMap((fact) => fact.sourceRefs),
        ...filterRelations.flatMap((relation) => relation.sourceRefs),
        ...(answer.relation?.sourceRefs ?? [])
      ])
    ].sort();
    const unknownSources = sourceRefs.filter((sourceRef) => !sourceIds.has(sourceRef));
    if (sourceRefs.length === 0 || unknownSources.length > 0) {
      throw new Error(
        `${template.id}: unbelegte oder unbekannte Quellen ${unknownSources.join(", ")}.`
      );
    }
    const targetName = preferredName(target.entity.id, dataset.names);
    const answerName = preferredName(answer.entity.id, dataset.names);
    const rankSentence = evidenceRanked
      .map(
        ({ entity, fact }, index) =>
          `Rang ${index + 1}: ${preferredName(entity.id, dataset.names)} (${formatFactValue(
            fact.value,
            definition.unit
          )})`
      )
      .join("; ");
    const relationSentence = answer.relation
      ? ` Das ermittelte Land ist ${targetName}; der Relationspfad führt zu ${answerName}.`
      : "";

    compiled.push({
      id: questionId,
      entityId: questionEntityId,
      templateId: template.id,
      promptDe: template.promptDe,
      answerEntityId: answer.entity.id,
      explanationDe: `${definition.labelDe}, Stand ${target.fact.asOf}: ${rankSentence}.${relationSentence}`,
      evidence: [
        ...rankingEvidence,
        ...filterFactEvidence,
        ...relationEvidence,
        ...answerEvidence
      ],
      sourceRefs,
      difficulty: template.difficulty
    });
    entities.push({
      id: questionEntityId,
      type: "knowledge_question",
      canonicalNameId: `name:${questionSuffix}:de:preferred`,
      difficulty: template.difficulty,
      active: true,
      sourceRefs
    });
    names.push({
      id: `name:${questionSuffix}:de:preferred`,
      entityId: questionEntityId,
      locale: "de",
      name: `Wissenspuzzle ${template.id}`,
      kind: "preferred",
      answerPolicy: "display_and_accept"
    });
    answerRelations.push({
      id: relationId,
      sourceId: questionEntityId,
      relationType: "has_answer",
      targetId: answer.entity.id,
      sourceRefs
    });
    for (const scopeRelation of dataset.relations.filter(
      (relation) =>
        relation.sourceId === target.entity.id &&
        relation.relationType === "located_in" &&
        relation.targetId.startsWith("continent:")
    )) {
      scopeRelations.push({
        id: `relation:${questionSuffix}:located-in:${scopeRelation.targetId.replaceAll(
          ":",
          "-"
        )}`,
        sourceId: questionEntityId,
        relationType: "located_in",
        targetId: scopeRelation.targetId,
        sourceRefs: scopeRelation.sourceRefs
      });
    }
  }

  return {
    questions: compiled,
    entities,
    names,
    answerRelations,
    scopeRelations
  };
}
