import type { GeoDataset } from "../../content/schema";
import {
  getLearningProfile,
  learningProfileFromRules,
  type LearningProfileId
} from "./learningProfiles";

export type EntityRef =
  | { from: "subject" }
  | {
      from: "subject";
      relation: string;
      direction: "outgoing" | "incoming";
    };

export type PromptKind =
  | "name"
  | "visual_asset"
  | "map_highlight"
  | "fact"
  | "description";

export type AnswerKind =
  | "text_input"
  | "single_choice"
  | "multi_choice"
  | "map_point"
  | "map_area"
  | "map_line"
  | "country_profile_input"
  | "fact_profile_input"
  | "drag_match"
  | "sort_order";

export type QuizRules = {
  questionCount: number | "all";
  randomizer: "mulberry32-v1";
  timer:
    | { kind: "none" }
    | { kind: "per_question"; seconds: number }
    | { kind: "total"; seconds: number };
  feedback: "immediate" | "end";
  retryMistakes: boolean;
  hints: "off" | "one" | "unlimited";
  seed?: string;
};

export interface QuizDefinition {
  id: string;
  schemaVersion: 1;
  datasetVersion: string;
  content: {
    subjectType: string;
    requiredRelations?: string[];
    filters?: Array<{
      field: "id" | "difficulty" | "scope_rank";
      op: "eq" | "in" | "gte" | "lte";
      value: string | number | string[];
    }>;
  };
  prompt: {
    kind: PromptKind;
    entity: EntityRef;
    field?: string;
    fields?: string[];
    locale: string;
  };
  answer: {
    kind: AnswerKind;
    entity: EntityRef;
    field?: string;
    grader: string;
    graderConfig?: Record<string, unknown>;
  };
  scope: {
    regionIds: string[];
    includeIds?: string[];
    excludeIds?: string[];
    difficulty?: [number, number];
  };
  rules: QuizRules;
}

export interface MixedQuizPool {
  id: string;
  definition: QuizDefinition;
  weight: number;
  minimum: number;
  maximum: number;
}

export interface MixedQuizDefinition {
  kind: "mixed";
  id: string;
  schemaVersion: 1;
  datasetVersion: string;
  label: string;
  profile: LearningProfileId;
  scope: {
    regionIds: string[];
  };
  pools: MixedQuizPool[];
  schedule: {
    maxConsecutiveFromPool: number;
  };
  rules: QuizRules;
}

export type QuizRoundDefinition = QuizDefinition | MixedQuizDefinition;

export function isMixedQuizDefinition(
  definition: QuizRoundDefinition
): definition is MixedQuizDefinition {
  return "kind" in definition && definition.kind === "mixed";
}

export type RoundDefinitionValidationResult =
  | { success: true; definition: QuizRoundDefinition }
  | { success: false; issues: DefinitionIssue[] };

function validateRules(
  value: unknown,
  path: string,
  issues: DefinitionIssue[]
) {
  if (!isRecord(value)) {
    issues.push({
      path,
      code: "invalid_rules",
      message: "rules muss ein Objekt sein."
    });
    return;
  }

  if (value.randomizer !== "mulberry32-v1") {
    issues.push({
      path: `${path}.randomizer`,
      code: "unknown_randomizer",
      message: "Nur der versionierte Zufallsgenerator mulberry32-v1 wird unterstützt."
    });
  }

  const count = value.questionCount;
  if (
    count !== "all" &&
    (!Number.isInteger(count) || Number(count) <= 0)
  ) {
    issues.push({
      path: `${path}.questionCount`,
      code: "invalid_question_count",
      message: "questionCount muss positiv oder all sein."
    });
  }

  if (!isRecord(value.timer)) {
    issues.push({
      path: `${path}.timer`,
      code: "invalid_timer",
      message: "Timerkonfiguration fehlt."
    });
  } else if (
    value.timer.kind !== "none" &&
    value.timer.kind !== "per_question" &&
    value.timer.kind !== "total"
  ) {
    issues.push({
      path: `${path}.timer.kind`,
      code: "invalid_timer",
      message: "Timer-Art ist ungültig."
    });
  } else if (
    value.timer.kind !== "none" &&
    (!Number.isInteger(value.timer.seconds) ||
      Number(value.timer.seconds) <= 0)
  ) {
    issues.push({
      path: `${path}.timer.seconds`,
      code: "invalid_timer_seconds",
      message: "Timersekunden müssen positiv sein."
    });
  }

  if (value.feedback !== "immediate" && value.feedback !== "end") {
    issues.push({
      path: `${path}.feedback`,
      code: "invalid_feedback",
      message: "Feedback muss immediate oder end sein."
    });
  }

  if (typeof value.retryMistakes !== "boolean") {
    issues.push({
      path: `${path}.retryMistakes`,
      code: "invalid_retry_rule",
      message: "retryMistakes muss ein Boolean sein."
    });
  }

  if (!["off", "one", "unlimited"].includes(String(value.hints))) {
    issues.push({
      path: `${path}.hints`,
      code: "invalid_hint_rule",
      message: "hints muss off, one oder unlimited sein."
    });
  }
}

export function validateMixedQuizDefinition(
  value: unknown,
  dataset: GeoDataset
): RoundDefinitionValidationResult {
  const issues: DefinitionIssue[] = [];

  if (!isRecord(value) || value.kind !== "mixed") {
    return {
      success: false,
      issues: [{
        path: "$",
        code: "invalid_type",
        message: "MixedQuizDefinition muss ein Objekt mit kind=mixed sein."
      }]
    };
  }

  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({ path: "id", code: "invalid_id", message: "id fehlt." });
  }
  if (value.schemaVersion !== 1) {
    issues.push({
      path: "schemaVersion",
      code: "unsupported_schema",
      message: "Nur MixedQuizDefinition-Schema 1 wird unterstützt."
    });
  }
  if (value.datasetVersion !== dataset.version) {
    issues.push({
      path: "datasetVersion",
      code: "dataset_mismatch",
      message: `Erwartet wird Dataset ${dataset.version}.`
    });
  }
  if (typeof value.label !== "string" || value.label.length === 0) {
    issues.push({ path: "label", code: "invalid_label", message: "label fehlt." });
  }
  if (
    value.profile !== "learn" &&
    value.profile !== "practice" &&
    value.profile !== "exam"
  ) {
    issues.push({
      path: "profile",
      code: "invalid_profile",
      message: "Profil muss learn, practice oder exam sein."
    });
  }

  if (
    !isRecord(value.scope) ||
    !Array.isArray(value.scope.regionIds) ||
    value.scope.regionIds.some((id) => typeof id !== "string")
  ) {
    issues.push({
      path: "scope.regionIds",
      code: "invalid_scope",
      message: "Mixed-Scope muss eine Liste von Regionen enthalten."
    });
  }

  if (!Array.isArray(value.pools) || value.pools.length < 2) {
    issues.push({
      path: "pools",
      code: "invalid_pools",
      message: "Ein Mixed-Quiz benötigt mindestens zwei Pools."
    });
  } else {
    const poolIds = new Set<string>();
    value.pools.forEach((pool, index) => {
      const path = `pools[${index}]`;
      if (!isRecord(pool)) {
        issues.push({ path, code: "invalid_pool", message: "Pool ist ungültig." });
        return;
      }
      if (typeof pool.id !== "string" || pool.id.length === 0) {
        issues.push({ path: `${path}.id`, code: "invalid_id", message: "Pool-ID fehlt." });
      } else if (poolIds.has(pool.id)) {
        issues.push({ path: `${path}.id`, code: "duplicate_id", message: "Pool-ID ist doppelt." });
      } else {
        poolIds.add(pool.id);
      }
      if (typeof pool.weight !== "number" || pool.weight <= 0) {
        issues.push({ path: `${path}.weight`, code: "invalid_weight", message: "Gewicht muss positiv sein." });
      }
      if (
        !Number.isInteger(pool.minimum) ||
        !Number.isInteger(pool.maximum) ||
        Number(pool.minimum) < 0 ||
        Number(pool.maximum) < Number(pool.minimum)
      ) {
        issues.push({ path, code: "invalid_bounds", message: "Poolgrenzen sind ungültig." });
      }
      const nested = validateQuizDefinition(pool.definition, dataset);
      if (!nested.success) {
        issues.push(
          ...nested.issues.map((issue) => ({
            ...issue,
            path: `${path}.definition.${issue.path}`
          }))
        );
      }
    });
  }

  if (
    !isRecord(value.schedule) ||
    !Number.isInteger(value.schedule.maxConsecutiveFromPool) ||
    Number(value.schedule.maxConsecutiveFromPool) < 1
  ) {
    issues.push({
      path: "schedule.maxConsecutiveFromPool",
      code: "invalid_schedule",
      message: "Die maximale Poolfolge muss positiv sein."
    });
  }
  validateRules(value.rules, "rules", issues);

  if (
    isRecord(value.rules) &&
    (value.profile === "learn" ||
      value.profile === "practice" ||
      value.profile === "exam") &&
    (value.rules.feedback === "immediate" ||
      value.rules.feedback === "end") &&
    typeof value.rules.retryMistakes === "boolean" &&
    ["off", "one", "unlimited"].includes(String(value.rules.hints))
  ) {
    const derivedProfile = learningProfileFromRules({
      feedback: value.rules.feedback,
      retryMistakes: value.rules.retryMistakes,
      hints: value.rules.hints as QuizRules["hints"]
    });
    if (derivedProfile !== value.profile) {
      issues.push({
        path: "profile",
        code: "profile_rules_mismatch",
        message: `Profil ${value.profile} passt nicht zu den Rundenregeln (${derivedProfile}).`
      });
    }
    if (
      getLearningProfile(value.profile).timerPolicy === "disabled" &&
      isRecord(value.rules.timer) &&
      value.rules.timer.kind !== "none"
    ) {
      issues.push({
        path: "rules.timer",
        code: "profile_timer_mismatch",
        message: `Im Lernmodus ${value.profile} ist kein Zeitlimit erlaubt.`
      });
    }
  }

  if (
    isRecord(value.rules) &&
    value.rules.questionCount === "all"
  ) {
    issues.push({
      path: "rules.questionCount",
      code: "invalid_mixed_question_count",
      message: "Mixed-Runden benötigen eine feste Fragenzahl."
    });
  }

  if (
    Array.isArray(value.pools) &&
    value.pools.every(isRecord) &&
    isRecord(value.rules) &&
    typeof value.rules.questionCount === "number"
  ) {
    const minimum = value.pools.reduce(
      (sum, pool) => sum + (typeof pool.minimum === "number" ? pool.minimum : 0),
      0
    );
    const maximum = value.pools.reduce(
      (sum, pool) => sum + (typeof pool.maximum === "number" ? pool.maximum : 0),
      0
    );
    if (value.rules.questionCount < minimum || value.rules.questionCount > maximum) {
      issues.push({
        path: "rules.questionCount",
        code: "mixed_count_out_of_bounds",
        message: "Fragenzahl liegt außerhalb der summierten Poolgrenzen."
      });
    }
  };

  return issues.length > 0
    ? { success: false, issues }
    : {
        success: true,
        definition: value as unknown as MixedQuizDefinition
      };
}

export type DefinitionIssue = {
  path: string;
  code: string;
  message: string;
};

export type DefinitionValidationResult =
  | { success: true; definition: QuizDefinition }
  | { success: false; issues: DefinitionIssue[] };

const PROMPT_KINDS = new Set<PromptKind>([
  "name",
  "visual_asset",
  "map_highlight",
  "fact",
  "description"
]);
const ANSWER_KINDS = new Set<AnswerKind>([
  "text_input",
  "single_choice",
  "multi_choice",
  "map_point",
  "map_area",
  "map_line",
  "country_profile_input",
  "fact_profile_input",
  "drag_match",
  "sort_order"
]);
const REGISTERED_GRADERS = new Set([
  "text-v1",
  "distance-v1",
  "area-v1",
  "line-v1",
  "single-choice-v1",
  "country-profile-v1",
  "fact-profile-v1"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEntityRef(
  value: unknown,
  path: string,
  relationTypeIds: Set<string>,
  issues: DefinitionIssue[]
) {
  if (!isRecord(value) || value.from !== "subject") {
    issues.push({
      path,
      code: "invalid_entity_ref",
      message: "EntityRef muss beim subject beginnen."
    });
    return;
  }

  if ("relation" in value) {
    if (
      typeof value.relation !== "string" ||
      !relationTypeIds.has(value.relation)
    ) {
      issues.push({
        path: `${path}.relation`,
        code: "unknown_relation",
        message: "EntityRef verweist auf einen unbekannten Relationstyp."
      });
    }

    if (value.direction !== "outgoing" && value.direction !== "incoming") {
      issues.push({
        path: `${path}.direction`,
        code: "invalid_direction",
        message: "Relationsrichtung muss outgoing oder incoming sein."
      });
    }
  }
}

export function validateQuizDefinition(
  value: unknown,
  dataset: GeoDataset
): DefinitionValidationResult {
  const issues: DefinitionIssue[] = [];

  if (!isRecord(value)) {
    return {
      success: false,
      issues: [
        {
          path: "$",
          code: "invalid_type",
          message: "QuizDefinition muss ein Objekt sein."
        }
      ]
    };
  }

  const entityTypeIds = new Set(dataset.entityTypes.map((type) => type.id));
  const relationTypeIds = new Set(
    dataset.relationTypes.map((relation) => relation.id)
  );
  const entityIds = new Set(dataset.entities.map((entity) => entity.id));

  if (typeof value.id !== "string" || value.id.length === 0) {
    issues.push({
      path: "id",
      code: "invalid_id",
      message: "id muss ein nichtleerer String sein."
    });
  }
  if (value.schemaVersion !== 1) {
    issues.push({
      path: "schemaVersion",
      code: "unsupported_schema",
      message: "Nur QuizDefinition-Schema 1 wird unterstützt."
    });
  }
  if (value.datasetVersion !== dataset.version) {
    issues.push({
      path: "datasetVersion",
      code: "dataset_mismatch",
      message: `Erwartet wird Dataset ${dataset.version}.`
    });
  }

  if (!isRecord(value.content)) {
    issues.push({
      path: "content",
      code: "invalid_content",
      message: "content muss ein Objekt sein."
    });
  } else {
    if (
      typeof value.content.subjectType !== "string" ||
      !entityTypeIds.has(value.content.subjectType)
    ) {
      issues.push({
        path: "content.subjectType",
        code: "unknown_entity_type",
        message: "subjectType ist nicht im Dataset registriert."
      });
    }

    if (
      value.content.requiredRelations !== undefined &&
      (!Array.isArray(value.content.requiredRelations) ||
        value.content.requiredRelations.some(
          (relation) =>
            typeof relation !== "string" || !relationTypeIds.has(relation)
        ))
    ) {
      issues.push({
        path: "content.requiredRelations",
        code: "unknown_relation",
        message: "Mindestens eine erforderliche Relation ist unbekannt."
      });
    }
    if (
      value.content.filters !== undefined &&
      (!Array.isArray(value.content.filters) ||
        value.content.filters.some(
          (filter) =>
            !isRecord(filter) ||
            !["id", "difficulty", "scope_rank"].includes(
              String(filter.field)
            ) ||
            !["eq", "in", "gte", "lte"].includes(String(filter.op)) ||
            !("value" in filter)
        ))
    ) {
      issues.push({
        path: "content.filters",
        code: "invalid_filter",
        message: "Mindestens ein Inhaltsfilter ist ungültig."
      });
    }
  }

  if (!isRecord(value.prompt)) {
    issues.push({
      path: "prompt",
      code: "invalid_prompt",
      message: "prompt muss ein Objekt sein."
    });
  } else {
    if (
      typeof value.prompt.kind !== "string" ||
      !PROMPT_KINDS.has(value.prompt.kind as PromptKind)
    ) {
      issues.push({
        path: "prompt.kind",
        code: "unknown_prompt",
        message: "Prompt-Art ist nicht registriert."
      });
    }
    if (typeof value.prompt.locale !== "string") {
      issues.push({
        path: "prompt.locale",
        code: "invalid_locale",
        message: "Prompt-Locale fehlt."
      });
    }
    if (
      value.prompt.kind === "visual_asset" &&
      value.prompt.field !== "flag" &&
      value.prompt.field !== "country_outline" &&
      value.prompt.field !== "constellation_chart"
    ) {
      issues.push({
        path: "prompt.field",
        code: "unknown_visual_asset",
        message: "visual_asset benötigt flag, country_outline oder constellation_chart."
      });
    }
    if (
      value.prompt.kind === "fact" &&
      (!Array.isArray(value.prompt.fields) ||
        value.prompt.fields.length === 0 ||
        value.prompt.fields.some(
          (field) =>
            typeof field !== "string" ||
            !dataset.factDefinitions.some(
              (definition) => definition.id === field
            )
        ))
    ) {
      issues.push({
        path: "prompt.fields",
        code: "unknown_fact",
        message: "fact benötigt mindestens eine registrierte Faktdefinition."
      });
    }
    validateEntityRef(
      value.prompt.entity,
      "prompt.entity",
      relationTypeIds,
      issues
    );
  }

  if (!isRecord(value.answer)) {
    issues.push({
      path: "answer",
      code: "invalid_answer",
      message: "answer muss ein Objekt sein."
    });
  } else {
    if (
      typeof value.answer.kind !== "string" ||
      !ANSWER_KINDS.has(value.answer.kind as AnswerKind)
    ) {
      issues.push({
        path: "answer.kind",
        code: "unknown_answer_mode",
        message: "Antwortmodus ist nicht registriert."
      });
    }
    if (
      typeof value.answer.grader !== "string" ||
      !REGISTERED_GRADERS.has(value.answer.grader)
    ) {
      issues.push({
        path: "answer.grader",
        code: "unknown_grader",
        message: "Grader ist nicht registriert."
      });
    }
    if (
      value.answer.kind === "single_choice" &&
      value.answer.grader !== "single-choice-v1"
    ) {
      issues.push({
        path: "answer.grader",
        code: "incompatible_grader",
        message: "single_choice benötigt single-choice-v1."
      });
    }
    if (
      value.answer.kind === "map_line" &&
      value.answer.grader !== "line-v1"
    ) {
      issues.push({
        path: "answer.grader",
        code: "incompatible_grader",
        message: "map_line benötigt line-v1."
      });
    }
    if (
      value.answer.kind === "country_profile_input" &&
      value.answer.grader !== "country-profile-v1"
    ) {
      issues.push({
        path: "answer.grader",
        code: "incompatible_grader",
        message: "country_profile_input benötigt country-profile-v1."
      });
    }
    if (
      value.answer.kind === "fact_profile_input" &&
      value.answer.grader !== "fact-profile-v1"
    ) {
      issues.push({
        path: "answer.grader",
        code: "incompatible_grader",
        message: "fact_profile_input benötigt fact-profile-v1."
      });
    }
    if (value.answer.kind === "fact_profile_input") {
      const definitions = isRecord(value.answer.graderConfig)
        ? value.answer.graderConfig.fieldDefinitions
        : undefined;
      if (
        !Array.isArray(definitions) ||
        definitions.length === 0 ||
        definitions.some((definition) => {
          if (
            !isRecord(definition) ||
            typeof definition.id !== "string" ||
            typeof definition.label !== "string" ||
            typeof definition.placeholder !== "string" ||
            !isRecord(definition.source)
          ) {
            return true;
          }
          const source = definition.source;
          if (source.kind === "entity_name") return false;
          return (
            source.kind !== "fact" ||
            typeof source.factTypeId !== "string" ||
            !dataset.factDefinitions.some(
              (fact) => fact.id === source.factTypeId
            )
          );
        }) ||
        new Set(
          definitions
            .filter(isRecord)
            .map((definition) => String(definition.id))
        ).size !== definitions.length
      ) {
        issues.push({
          path: "answer.graderConfig.fieldDefinitions",
          code: "invalid_profile_fields",
          message: "fact_profile_input benötigt eindeutige, gültige Felddefinitionen."
        });
      }
    }
    if (
      value.answer.kind === "single_choice" &&
      value.answer.field !== undefined &&
      value.answer.field !== "name" &&
      value.answer.field !== "flag" &&
      value.answer.field !== "country_outline"
    ) {
      issues.push({
        path: "answer.field",
        code: "unknown_choice_presentation",
        message: "Auswahl zeigt name, flag oder country_outline."
      });
    }
    validateEntityRef(
      value.answer.entity,
      "answer.entity",
      relationTypeIds,
      issues
    );
  }

  if (!isRecord(value.scope)) {
    issues.push({
      path: "scope",
      code: "invalid_scope",
      message: "scope muss ein Objekt sein."
    });
  } else if (
    !Array.isArray(value.scope.regionIds) ||
    value.scope.regionIds.some(
      (id) => typeof id !== "string" || !entityIds.has(id)
    )
  ) {
    issues.push({
      path: "scope.regionIds",
      code: "unknown_region",
      message: "Scope enthält unbekannte Regionen."
    });
  }

  validateRules(value.rules, "rules", issues);

  return issues.length > 0
    ? { success: false, issues }
    : { success: true, definition: value as unknown as QuizDefinition };
}

export function parseQuizDefinition(
  value: unknown,
  dataset: GeoDataset
): QuizDefinition {
  const result = validateQuizDefinition(value, dataset);

  if (!result.success) {
    throw new Error(
      `Ungültige QuizDefinition:\n${result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return result.definition;
}

export function validateQuizRoundDefinition(
  value: unknown,
  dataset: GeoDataset
): RoundDefinitionValidationResult {
  return isRecord(value) && value.kind === "mixed"
    ? validateMixedQuizDefinition(value, dataset)
    : validateQuizDefinition(value, dataset);
}

export function parseQuizRoundDefinition(
  value: unknown,
  dataset: GeoDataset
): QuizRoundDefinition {
  const result = validateQuizRoundDefinition(value, dataset);

  if (!result.success) {
    throw new Error(
      `Ungültige Rundendefinition:\n${result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return result.definition;
}
