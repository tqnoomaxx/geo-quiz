import type { ContentEntity } from "../../content/schema";
import type { ContentRepository } from "../../content/repository";
import { shuffled } from "../random/seeded";
import type { EntityRef, QuizDefinition } from "./definition";
import type {
  QuestionChoice,
  QuestionInstance,
  QuestionPromptPayload,
  VisualAssetKind,
  VisualAssetReference
} from "./question";
import type {
  CountryProfileFieldConfig,
  CountryProfileFieldId
} from "../graders/countryProfile";
import type {
  FactProfileFieldConfig,
  FactProfileFieldDefinition
} from "../graders/factProfile";

const germanNumberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2
});

function resolveEntities(
  repository: ContentRepository,
  subject: ContentEntity,
  reference: EntityRef
) {
  if (!("relation" in reference)) {
    return [subject];
  }

  return repository.getRelatedEntities(
    subject.id,
    reference.relation,
    reference.direction
  );
}

function resolveEntity(
  repository: ContentRepository,
  subject: ContentEntity,
  reference: EntityRef
) {
  const related = resolveEntities(repository, subject, reference);

  if (related.length !== 1) {
    const relationLabel =
      "relation" in reference ? reference.relation : "subject";
    throw new Error(
      `${subject.id}: EntityRef ${relationLabel} löst ${related.length} statt genau einer Entität auf.`
    );
  }

  return related[0];
}

function matchesFilters(
  entity: ContentEntity,
  definition: QuizDefinition
) {
  return (definition.content.filters ?? []).every((filter) => {
    const actual =
      filter.field === "id"
        ? entity.id
        : filter.field === "scope_rank"
          ? entity.rankByScope?.[definition.scope.regionIds[0] ?? "world"]
          : entity.difficulty;

    if (filter.op === "eq") {
      return actual === filter.value;
    }
    if (filter.op === "in") {
      return Array.isArray(filter.value) && filter.value.includes(String(actual));
    }
    if (filter.op === "gte") {
      return (
        typeof actual === "number" &&
        typeof filter.value === "number" &&
        actual >= filter.value
      );
    }
    if (filter.op === "lte") {
      return (
        typeof actual === "number" &&
        typeof filter.value === "number" &&
        actual <= filter.value
      );
    }

    return false;
  });
}

function hasRequiredRelations(
  repository: ContentRepository,
  entity: ContentEntity,
  definition: QuizDefinition
) {
  return (definition.content.requiredRelations ?? []).every(
    (relationType) =>
      repository.getRelatedEntities(entity.id, relationType, "outgoing")
        .length > 0 ||
      repository.getRelatedEntities(entity.id, relationType, "incoming")
        .length > 0
  );
}

function createPromptPayload(
  repository: ContentRepository,
  entity: ContentEntity,
  definition: QuizDefinition
): QuestionPromptPayload {
  const label =
    repository.getDisplayName(entity.id, definition.prompt.locale) ?? entity.id;

  if (definition.prompt.kind === "name") {
    return {
      kind: "name",
      entityId: entity.id,
      label: entity.promptQualifier
        ? `${label} (${entity.promptQualifier})`
        : label,
      locale: definition.prompt.locale
    };
  }

  if (definition.prompt.kind === "map_highlight") {
    const isLine = entity.geometryRef?.layer === "physical-lines";
    const isArea =
      entity.geometryRef &&
      entity.geometryRef.layer !== "physical-lines" &&
      entity.type !== "peak";
    return {
      kind: "map_highlight",
      entityId: entity.id,
      label,
      coordinates: entity.centroid,
      areaId: isArea ? entity.id : undefined,
      lineId: isLine ? entity.id : undefined
    };
  }

  if (definition.prompt.kind === "visual_asset") {
    const assetKind = definition.prompt.field;
    if (
      assetKind !== "flag" &&
      assetKind !== "country_outline" &&
      assetKind !== "constellation_chart"
    ) {
      throw new Error(
        `${definition.id}: visual_asset besitzt eine unbekannte Asset-Art.`
      );
    }

    return {
      kind: "visual_asset",
      entityId: entity.id,
      label,
      asset: visualAssetReference(entity, assetKind)
    };
  }

  if (definition.prompt.kind === "description") {
    const question = repository.getCompiledKnowledgeQuestion(entity.id);
    if (!question) {
      throw new Error(`${entity.id} besitzt keine kompilierte Wissensfrage.`);
    }
    return {
      kind: "description",
      entityId: entity.id,
      label: question.promptDe,
      locale: definition.prompt.locale
    };
  }

  if (definition.prompt.kind === "fact") {
    const factTypeIds = definition.prompt.fields ?? [];
    const facts = factTypeIds.map((factTypeId) => {
      const fact = repository.getFact(entity.id, factTypeId);
      const factDefinition = repository.getFactDefinition(factTypeId);
      if (!fact || !factDefinition) {
        throw new Error(
          `${entity.id} besitzt keinen vollständigen Fakt ${factTypeId}.`
        );
      }
      const formattedValue =
        typeof fact.value === "number"
          ? germanNumberFormatter.format(fact.value)
          : fact.value;
      return {
        factTypeId,
        label: factDefinition.labelDe,
        value: factDefinition.unit
          ? `${formattedValue} ${factDefinition.unit}`
          : formattedValue
      };
    });
    return {
      kind: "fact",
      entityId: entity.id,
      label: entity.promptQualifier ?? "Faktenprofil",
      locale: definition.prompt.locale,
      facts
    };
  }

  throw new Error(
    `Prompt ${definition.prompt.kind} besitzt noch keinen Phase-1-Compiler.`
  );
}

function visualAssetReference(
  entity: ContentEntity,
  kind: VisualAssetKind
): VisualAssetReference {
  const validCountryAsset =
    entity.type === "country" &&
    (kind === "flag" || kind === "country_outline");
  const validConstellationAsset =
    entity.type === "zodiac_constellation" &&
    kind === "constellation_chart";
  if (!validCountryAsset && !validConstellationAsset) {
    throw new Error(
      `${entity.id}: ${kind} ist für diesen Entitätstyp nicht registriert.`
    );
  }

  return {
    kind,
    key: `visual:${kind}:${entity.id}`,
    entityId: entity.id
  };
}

const COUNTRY_PROFILE_RELATIONS: Array<{
  id: CountryProfileFieldId;
  label: string;
  relation: string;
  targetType?: string;
}> = [
  { id: "capital", label: "Hauptstadt", relation: "has_capital" },
  {
    id: "language",
    label: "Amtssprache",
    relation: "has_official_language"
  },
  { id: "currency", label: "Währung", relation: "uses_currency" }
];

function createCountryProfileConfig(
  repository: ContentRepository,
  country: ContentEntity,
  locale: string
) {
  if (country.type !== "country") {
    throw new Error(`${country.id}: Länderprofile benötigen ein Land.`);
  }

  const profileFields: CountryProfileFieldConfig[] =
    COUNTRY_PROFILE_RELATIONS.map((field) => {
      const expectedEntities = repository
        .getRelatedEntities(country.id, field.relation, "outgoing")
        .filter((entity) => !field.targetType || entity.type === field.targetType)
        .sort((left, right) => left.id.localeCompare(right.id));
      if (expectedEntities.length === 0) {
        throw new Error(
          `${country.id}: Länderprofil besitzt keinen Wert für ${field.label}.`
        );
      }
      const expectedNames = expectedEntities.flatMap((entity) =>
        repository
          .getAcceptedNames(entity.id, locale)
          .map((name) => ({ id: name.id, value: name.name }))
      );
      const displayNames = expectedEntities
        .map(
          (entity) => repository.getDisplayName(entity.id, locale) ?? entity.id
        )
        .sort((left, right) => left.localeCompare(right, "de"));
      return {
        id: field.id,
        label: field.label,
        expectedEntityIds: expectedEntities.map((entity) => entity.id),
        expectedNames,
        expectedLabel: joinAlternativeLabels(displayNames)
      };
    });

  return {
    profileFields,
    expectedEntityIds: profileFields.flatMap(
      (field) => field.expectedEntityIds
    ),
    expectedLabel: profileFields
      .map((field) => `${field.label}: ${field.expectedLabel}`)
      .join(" · ")
  };
}

function createFactProfileConfig(
  repository: ContentRepository,
  entity: ContentEntity,
  locale: string,
  rawDefinitions: unknown
) {
  if (!Array.isArray(rawDefinitions) || rawDefinitions.length === 0) {
    throw new Error(`${entity.id}: Faktenprofil benötigt Felddefinitionen.`);
  }
  const definitions = rawDefinitions as FactProfileFieldDefinition[];
  const profileFields: FactProfileFieldConfig[] = definitions.map(
    (definition) => {
      if (definition.source.kind === "entity_name") {
        const expectedNames = repository
          .getAcceptedNames(entity.id, locale)
          .map((name) => ({ id: name.id, value: name.name }));
        const expectedLabel =
          repository.getDisplayName(entity.id, locale) ?? entity.id;
        if (expectedNames.length === 0) {
          throw new Error(`${entity.id}: Faktenprofil besitzt keinen Namen.`);
        }
        return {
          id: definition.id,
          label: definition.label,
          placeholder: definition.placeholder,
          expectedNames,
          expectedLabel
        };
      }

      const fact = repository.getFact(entity.id, definition.source.factTypeId);
      if (!fact) {
        throw new Error(
          `${entity.id}: Faktenprofil besitzt ${definition.source.factTypeId} nicht.`
        );
      }
      const value = String(fact.value);
      return {
        id: definition.id,
        label: definition.label,
        placeholder: definition.placeholder,
        expectedNames: [
          { id: `${fact.id}:canonical`, value },
          ...(fact.acceptedValues ?? []).map((accepted, index) => ({
            id: `${fact.id}:accepted-${index + 1}`,
            value: accepted
          }))
        ],
        expectedLabel: value
      };
    }
  );

  return {
    profileFields,
    expectedLabel: profileFields
      .map((field) => `${field.label}: ${field.expectedLabel}`)
      .join(" · ")
  };
}

function createAnswerConfig(
  repository: ContentRepository,
  entities: readonly ContentEntity[],
  definition: QuizDefinition,
  countryProfile?: ReturnType<typeof createCountryProfileConfig>,
  factProfile?: ReturnType<typeof createFactProfileConfig>
) {
  const baseConfig = definition.answer.graderConfig ?? {};
  const entity = entities[0];
  if (!entity) {
    throw new Error(`${definition.id}: Die Frage besitzt keine Antwortentität.`);
  }

  if (definition.answer.kind !== "text_input" && entities.length !== 1) {
    throw new Error(
      `${definition.id}: ${definition.answer.kind} benötigt genau eine Antwortentität.`
    );
  }

  if (definition.answer.kind === "map_point") {
    if (!entity.centroid) {
      throw new Error(`${entity.id} besitzt keinen Kartenpunkt.`);
    }

    return {
      ...baseConfig,
      targetCoordinates: entity.centroid,
      thresholdKm:
        typeof baseConfig.thresholdKm === "number"
          ? baseConfig.thresholdKm
          : 160
    };
  }

  if (definition.answer.kind === "map_area") {
    if (!entity.geometryRef) {
      throw new Error(`${entity.id} besitzt keine Flächengeometrie.`);
    }

    return {
      ...baseConfig,
      acceptedAreaIds: [entity.id]
    };
  }

  if (definition.answer.kind === "map_line") {
    if (entity.geometryRef?.layer !== "physical-lines") {
      throw new Error(`${entity.id} besitzt keine Liniengeometrie.`);
    }
    return {
      ...baseConfig,
      acceptedLineIds: [entity.id]
    };
  }

  if (definition.answer.kind === "text_input") {
    return {
      ...baseConfig,
      expectedNames: entities.flatMap((answerEntity) =>
        repository
          .getAcceptedNames(answerEntity.id, definition.prompt.locale)
          .map((name) => ({ id: name.id, value: name.name }))
      )
    };
  }

  if (definition.answer.kind === "single_choice") {
    return baseConfig;
  }

  if (definition.answer.kind === "country_profile_input" && countryProfile) {
    return {
      ...baseConfig,
      profileFields: countryProfile.profileFields
    };
  }

  if (definition.answer.kind === "fact_profile_input" && factProfile) {
    return {
      ...baseConfig,
      profileFields: factProfile.profileFields
    };
  }

  throw new Error(
    `Antwortmodus ${definition.answer.kind} besitzt noch keinen Phase-1-Compiler.`
  );
}

function createChoices(
  repository: ContentRepository,
  answerEntity: ContentEntity,
  answerCandidates: readonly ContentEntity[],
  definition: QuizDefinition,
  seedMaterial: string
): QuestionChoice[] | undefined {
  if (definition.answer.kind !== "single_choice") return undefined;

  const configuredCount = definition.answer.graderConfig?.choiceCount;
  const choiceCount =
    typeof configuredCount === "number" && Number.isInteger(configuredCount)
      ? configuredCount
      : 4;
  if (choiceCount < 2) {
    throw new Error(`${definition.id}: Auswahlfragen benötigen mindestens zwei Optionen.`);
  }

  const byEntityId = new Map(
    answerCandidates
      .filter((entity) => entity.type === answerEntity.type)
      .map((entity) => [entity.id, entity])
  );
  byEntityId.set(answerEntity.id, answerEntity);
  const distractors = shuffled(
    [...byEntityId.values()].filter((entity) => entity.id !== answerEntity.id),
    `${seedMaterial}|distractors|${answerEntity.id}`
  ).slice(0, choiceCount - 1);

  if (distractors.length < choiceCount - 1) {
    throw new Error(
      `${definition.id}: Für ${answerEntity.id} fehlen eindeutige Auswahloptionen.`
    );
  }

  const visualKind =
    definition.answer.field === "flag" ||
    definition.answer.field === "country_outline"
      ? definition.answer.field
      : undefined;
  const options = [answerEntity, ...distractors].map((entity) => ({
    id: `choice:${entity.id}`,
    entityId: entity.id,
    label:
      repository.getDisplayName(entity.id, definition.prompt.locale) ??
      entity.id,
    visualAsset: visualKind
      ? visualAssetReference(entity, visualKind)
      : undefined
  }));

  return shuffled(options, `${seedMaterial}|positions|${answerEntity.id}`);
}

function promptCopy(
  label: string,
  promptKind: QuizDefinition["prompt"]["kind"],
  answerKind: QuizDefinition["answer"]["kind"],
  subjectType: string,
  promptField?: string,
  answerField?: string,
  answerRelation?: string,
  answerCount = 1
) {
  if (answerKind === "country_profile_input") {
    return {
      promptText: `Was weißt du über ${label}?`,
      instruction: "Nenne für jedes Feld eine passende Antwort."
    };
  }

  if (answerKind === "fact_profile_input") {
    return {
      promptText: "Welches Sternzeichen ist das?",
      instruction: "Erkenne das Sternbild und ergänze die gewählten Angaben."
    };
  }

  if (answerKind === "map_point") {
    return {
      promptText: `Wo liegt ${label}?`,
      instruction: "Klicke auf die Karte."
    };
  }

  if (answerKind === "map_area") {
    return {
      promptText: `Klicke ${label} an.`,
      instruction:
        subjectType === "country"
          ? "Wähle die passende Landesfläche."
          : "Wähle die passende Fläche im Datensatz."
    };
  }

  if (answerKind === "map_line") {
    return {
      promptText: `Klicke ${label} an.`,
      instruction: "Wähle den passenden Flussverlauf."
    };
  }

  if (promptKind === "map_highlight" && answerKind === "text_input") {
    const physicalLabels: Record<string, string> = {
      river: "Welcher Fluss ist markiert?",
      lake: "Welcher See ist markiert?",
      sea: "Welches Meer ist markiert?",
      mountain_range: "Welches Gebirge ist markiert?",
      peak: "Welcher Gipfel ist markiert?"
    };
    return {
      promptText:
        physicalLabels[subjectType] ??
        (subjectType === "city"
          ? "Welche Hauptstadt ist markiert?"
          : subjectType === "ranked_city"
            ? "Welche Stadt ist markiert?"
            : "Welches Land ist markiert?"),
      instruction: "Gib den passenden Namen ein."
    };
  }

  if (promptKind === "visual_asset") {
    return {
      promptText:
        promptField === "country_outline"
          ? "Welches Land zeigt dieser Umriss?"
          : promptField === "constellation_chart"
            ? "Welches Sternzeichen ist das?"
          : "Zu welchem Land gehört diese Flagge?",
      instruction:
        answerKind === "single_choice"
          ? "Wähle die passende Antwort."
          : "Gib den passenden Namen ein."
    };
  }

  if (promptKind === "description") {
    return {
      promptText: label,
      instruction:
        answerKind === "single_choice"
          ? "Leite die Antwort aus den Angaben ab und wähle sie aus."
          : "Leite die Antwort aus den Angaben ab und gib den Namen ein."
    };
  }

  if (promptKind === "fact") {
    return {
      promptText:
        subjectType === "ranked_river"
          ? "Welches Flusssystem passt zu diesen Angaben?"
          : subjectType === "ranked_peak"
            ? "Welcher Berg passt zu diesen Angaben?"
            : subjectType === "planet"
              ? "Welcher Planet passt zu diesen Angaben?"
              : subjectType === "moon"
                ? "Welcher Mond passt zu diesen Angaben?"
                : subjectType === "dwarf_planet"
                  ? "Welcher Zwergplanet passt zu diesen Angaben?"
                  : "Welche Entität passt zu diesen Fakten?",
      instruction: "Gib den passenden Namen ein."
    };
  }

  if (answerKind === "single_choice" && answerField === "flag") {
    return {
      promptText: `Welche Flagge gehört zu ${label}?`,
      instruction: "Wähle die passende Flagge."
    };
  }

  if (answerRelation === "has_capital") {
    return {
      promptText:
        answerCount > 1
          ? `Nenne einen Hauptstadtsitz von ${label}.`
          : `Wie heißt die Hauptstadt von ${label}?`,
      instruction:
        "Gib einen gültigen Hauptstadtsitz ein. Bei mehreren Rollen zählt jeder gepflegte Sitz."
    };
  }

  if (answerRelation === "is_capital_of") {
    return {
      promptText: `Zu welchem Land gehört ${label}?`,
      instruction: "Gib den passenden Ländernamen ein."
    };
  }

  return {
    promptText: `Welche Antwort gehört zu ${label}?`,
    instruction:
      answerKind === "single_choice"
        ? "Wähle die passende Antwort."
        : "Gib den passenden Namen ein."
  };
}

function skillPart(kind: string, field?: string) {
  return field ? `${kind}:${field}` : kind;
}

function joinAlternativeLabels(labels: readonly string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} oder ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} oder ${labels.at(-1)}`;
}

function feedbackLabel(
  reference: EntityRef,
  answerLabel: string,
  promptLabel: string,
  answerCount: number,
  promptPayload: QuestionPromptPayload
) {
  if (promptPayload.kind === "fact") {
    const facts = promptPayload.facts
      .map((fact) => `${fact.label}: ${fact.value}`)
      .join(" · ");
    return `${answerLabel} · ${facts}`;
  }
  if (!("relation" in reference)) return answerLabel;
  if (reference.relation === "has_capital") {
    const capitalLabel =
      answerCount > 1 ? "Hauptstadtsitze" : "Hauptstadt";
    return `${capitalLabel}: ${answerLabel} · Land: ${promptLabel}`;
  }
  if (reference.relation === "is_capital_of") {
    return `Land: ${answerLabel} · Hauptstadt: ${promptLabel}`;
  }
  return answerLabel;
}

export function selectQuizCandidates(
  definition: QuizDefinition,
  repository: ContentRepository
) {
  const includeIds = new Set(definition.scope.includeIds ?? []);
  const excludeIds = new Set(definition.scope.excludeIds ?? []);
  const difficulty = definition.scope.difficulty;
  const candidates = repository
    .getEntitiesByType(definition.content.subjectType)
    .filter((entity) => entity.active)
    .filter(
      (entity) => includeIds.size === 0 || includeIds.has(entity.id)
    )
    .filter((entity) => !excludeIds.has(entity.id))
    .filter(
      (entity) =>
        !difficulty ||
        (entity.difficulty >= difficulty[0] &&
          entity.difficulty <= difficulty[1])
    )
    .filter((entity) =>
      repository.isWithinScope(entity.id, definition.scope.regionIds)
    )
    .filter((entity) => matchesFilters(entity, definition))
    .filter((entity) => hasRequiredRelations(repository, entity, definition))
    .sort((left, right) => left.id.localeCompare(right.id));

  return candidates;
}

export function generateQuestions(
  definition: QuizDefinition,
  repository: ContentRepository,
  seed = definition.rules.seed ?? "default"
): QuestionInstance[] {
  const candidates = selectQuizCandidates(definition, repository);
  const requestedCount =
    definition.rules.questionCount === "all"
      ? candidates.length
      : definition.rules.questionCount;

  if (requestedCount > candidates.length) {
    throw new Error(
      `Quiz ${definition.id} verlangt ${requestedCount} Fragen, hat aber nur ${candidates.length} Kandidaten.`
    );
  }

  const seedMaterial = [
    repository.dataset.version,
    definition.id,
    definition.rules.randomizer,
    definition.scope.regionIds.join(","),
    seed
  ].join("|");
  const selected = shuffled(candidates, seedMaterial).slice(0, requestedCount);
  const answerCandidates = [
    ...new Map(
      candidates.flatMap((subject) => {
        const entities = resolveEntities(
          repository,
          subject,
          definition.answer.entity
        );
        return entities.map((entity) => [entity.id, entity] as const);
      })
    ).values()
  ];

  return selected.map((subject, index) => {
    const promptEntity = resolveEntity(
      repository,
      subject,
      definition.prompt.entity
    );
    const answerEntities = resolveEntities(
      repository,
      subject,
      definition.answer.entity
    );
    if (answerEntities.length === 0) {
      throw new Error(`${subject.id}: Die Frage besitzt keine Antwortentität.`);
    }
    const answerEntity = answerEntities[0];
    const promptPayload = createPromptPayload(
      repository,
      promptEntity,
      definition
    );
    const countryProfile =
      definition.answer.kind === "country_profile_input"
        ? createCountryProfileConfig(
            repository,
            subject,
            definition.prompt.locale
          )
        : undefined;
    const factProfile =
      definition.answer.kind === "fact_profile_input"
        ? createFactProfileConfig(
            repository,
            subject,
            definition.prompt.locale,
            definition.answer.graderConfig?.fieldDefinitions
          )
        : undefined;
    const answerLabels = answerEntities
      .map(
        (entity) =>
          repository.getDisplayName(entity.id, definition.prompt.locale) ??
          entity.id
      )
      .sort((left, right) => left.localeCompare(right, "de"));
    const answerLabel = joinAlternativeLabels(answerLabels);
    const expectedLabel =
      countryProfile?.expectedLabel ??
      factProfile?.expectedLabel ??
      feedbackLabel(
        definition.answer.entity,
        answerLabel,
        promptPayload.label,
        answerEntities.length,
        promptPayload
      );
    const copy = promptCopy(
      promptPayload.label,
      definition.prompt.kind,
      definition.answer.kind,
      definition.content.subjectType,
      definition.prompt.field,
      definition.answer.field,
      "relation" in definition.answer.entity
        ? definition.answer.entity.relation
        : undefined,
      answerEntities.length
    );
    const answerConfig = createAnswerConfig(
      repository,
      answerEntities,
      definition,
      countryProfile,
      factProfile
    );
    if (definition.answer.kind === "single_choice" && answerEntities.length > 1) {
      throw new Error(
        `${definition.id}: Auswahlfragen benötigen genau eine Antwortentität.`
      );
    }
    const choices = createChoices(
      repository,
      answerEntity,
      answerCandidates,
      definition,
      seedMaterial
    );
    const compiledKnowledge =
      subject.type === "knowledge_question"
        ? repository.getCompiledKnowledgeQuestion(subject.id)
        : undefined;

    return {
      schemaVersion: 1,
      id: `${definition.id}:${seed}:${index + 1}:${subject.id}`,
      ordinal: index,
      subjectId: subject.id,
      promptPayload,
      promptText: copy.promptText,
      instruction: copy.instruction,
      answerSpec: {
        kind: definition.answer.kind,
        expectedEntityIds:
          countryProfile?.expectedEntityIds ??
          answerEntities.map((entity) => entity.id),
        graderId: definition.answer.grader,
        graderConfig: answerConfig,
        options: choices
      },
      feedback: {
        expectedLabel,
        targetCoordinates: answerEntity.centroid,
        targetAreaId:
          answerEntity.geometryRef &&
          answerEntity.geometryRef.layer !== "physical-lines" &&
          answerEntity.type !== "peak"
            ? answerEntity.id
            : undefined,
        targetLineId:
          answerEntity.geometryRef?.layer === "physical-lines"
            ? answerEntity.id
            : undefined,
        explanation: compiledKnowledge
          ? {
              text: compiledKnowledge.explanationDe,
              evidence: compiledKnowledge.evidence,
              sources: compiledKnowledge.sourceRefs.map((sourceRef) => {
                const source = repository.getSource(sourceRef);
                if (!source) {
                  throw new Error(
                    `${compiledKnowledge.id}: Quelle ${sourceRef} fehlt.`
                  );
                }
                return source;
              })
            }
          : undefined
      },
      metadata: {
        promptKind: definition.prompt.kind,
        skillKey: `${definition.content.subjectType}:${skillPart(
          definition.prompt.kind,
          definition.prompt.field
        )}_to_${skillPart(definition.answer.kind, definition.answer.field)}`,
        regionId: definition.scope.regionIds[0] ?? "world",
        entityType: definition.content.subjectType,
        answerEntityType: answerEntity.type,
        sourceDefinitionId: definition.id
      }
    };
  });
}
