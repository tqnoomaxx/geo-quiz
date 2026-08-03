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

export interface ContentRepository {
  dataset: GeoDataset;
  getEntity(id: string): ContentEntity | undefined;
  getEntitiesByType(type: string): ContentEntity[];
  getDisplayName(entityId: string, locale: string): string | undefined;
  getAcceptedNames(entityId: string, locale: string): LocalizedName[];
  getCompiledKnowledgeQuestion(
    entityId: string
  ): CompiledKnowledgeQuestion | undefined;
  getSource(id: string): DatasetSource | undefined;
  getFact(entityId: string, factTypeId: string): EntityFact | undefined;
  getFacts(entityId: string): EntityFact[];
  getFactDefinition(id: string): FactDefinition | undefined;
  getRelatedEntities(
    entityId: string,
    relationType: string,
    direction: "outgoing" | "incoming"
  ): ContentEntity[];
  isWithinScope(entityId: string, regionIds: readonly string[]): boolean;
}

export function createContentRepository(
  dataset: GeoDataset
): ContentRepository {
  const entitiesById = new Map(
    dataset.entities.map((entity) => [entity.id, entity])
  );
  const entitiesByType = new Map<string, ContentEntity[]>();
  const namesByEntity = new Map<string, LocalizedName[]>();
  const outgoingRelations = new Map<string, EntityRelation[]>();
  const incomingRelations = new Map<string, EntityRelation[]>();
  const knowledgeQuestionsByEntityId = new Map(
    dataset.compiledKnowledgeQuestions.map((question) => [
      question.entityId,
      question
    ])
  );
  const sourcesById = new Map(
    dataset.sources.map((source) => [source.id, source])
  );
  const factDefinitionsById = new Map(
    dataset.factDefinitions.map((definition) => [definition.id, definition])
  );
  const factsByEntityId = new Map<string, EntityFact[]>();

  for (const entity of dataset.entities) {
    const current = entitiesByType.get(entity.type) ?? [];
    current.push(entity);
    entitiesByType.set(entity.type, current);
  }

  for (const name of dataset.names) {
    const current = namesByEntity.get(name.entityId) ?? [];
    current.push(name);
    namesByEntity.set(name.entityId, current);
  }

  for (const relation of dataset.relations) {
    const outgoing = outgoingRelations.get(relation.sourceId) ?? [];
    outgoing.push(relation);
    outgoingRelations.set(relation.sourceId, outgoing);

    const incoming = incomingRelations.get(relation.targetId) ?? [];
    incoming.push(relation);
    incomingRelations.set(relation.targetId, incoming);
  }

  for (const fact of dataset.facts) {
    const current = factsByEntityId.get(fact.entityId) ?? [];
    current.push(fact);
    factsByEntityId.set(fact.entityId, current);
  }

  const getRelatedEntities: ContentRepository["getRelatedEntities"] = (
    entityId,
    relationType,
    direction
  ) => {
    const relations =
      direction === "outgoing"
        ? outgoingRelations.get(entityId)
        : incomingRelations.get(entityId);

    return (relations ?? [])
      .filter((relation) => relation.relationType === relationType)
      .map((relation) =>
        entitiesById.get(
          direction === "outgoing" ? relation.targetId : relation.sourceId
        )
      )
      .filter((entity): entity is ContentEntity => Boolean(entity));
  };

  const isWithinScope: ContentRepository["isWithinScope"] = (
    entityId,
    regionIds
  ) => {
    if (regionIds.length === 0 || regionIds.includes(entityId)) {
      return true;
    }

    const targetRegions = new Set(regionIds);
    const visited = new Set<string>([entityId]);
    const queue = [entityId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      const parents = getRelatedEntities(currentId, "located_in", "outgoing");

      for (const parent of parents) {
        if (targetRegions.has(parent.id)) {
          return true;
        }

        if (!visited.has(parent.id)) {
          visited.add(parent.id);
          queue.push(parent.id);
        }
      }
    }

    return false;
  };

  return {
    dataset,
    getEntity: (id) => entitiesById.get(id),
    getEntitiesByType: (type) => [...(entitiesByType.get(type) ?? [])],
    getDisplayName: (entityId, locale) =>
      namesByEntity
        .get(entityId)
        ?.find(
          (name) =>
            name.locale === locale &&
            name.kind === "preferred" &&
            name.answerPolicy === "display_and_accept"
        )?.name,
    getAcceptedNames: (entityId, locale) =>
      (namesByEntity.get(entityId) ?? []).filter(
        (name) =>
          name.locale === locale &&
          (name.answerPolicy === "display_and_accept" ||
            name.answerPolicy === "accept_only")
      ),
    getCompiledKnowledgeQuestion: (entityId) =>
      knowledgeQuestionsByEntityId.get(entityId),
    getSource: (id) => sourcesById.get(id),
    getFact: (entityId, factTypeId) =>
      factsByEntityId
        .get(entityId)
        ?.find((fact) => fact.factTypeId === factTypeId),
    getFacts: (entityId) => [...(factsByEntityId.get(entityId) ?? [])],
    getFactDefinition: (id) => factDefinitionsById.get(id),
    getRelatedEntities,
    isWithinScope
  };
}
