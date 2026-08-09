import type { Coordinates } from "../graders/geo";
import type { AnswerKind, PromptKind } from "./definition";
import type { DatasetSource, KnowledgeEvidence } from "../../content/schema";

export type VisualAssetKind =
  | "flag"
  | "country_outline"
  | "constellation_chart"
  | "landmark_photo";

export interface VisualAssetReference {
  kind: VisualAssetKind;
  key: string;
  entityId: string;
}

export type QuestionPromptPayload =
  | {
      kind: "name";
      entityId: string;
      label: string;
      locale: string;
    }
  | {
      kind: "map_highlight";
      entityId: string;
      label: string;
      coordinates?: Coordinates;
      areaId?: string;
      lineId?: string;
    }
  | {
      kind: "visual_asset";
      entityId: string;
      label: string;
      asset: VisualAssetReference;
    }
  | {
      kind: "description";
      entityId: string;
      label: string;
      locale: string;
    }
  | {
      kind: "fact";
      entityId: string;
      label: string;
      locale: string;
      facts: Array<{
        factTypeId: string;
        label: string;
        value: string;
      }>;
    };

export interface QuestionChoice {
  id: string;
  entityId: string;
  label: string;
  visualAsset?: VisualAssetReference;
}

export interface QuestionInstance {
  schemaVersion: 1;
  id: string;
  ordinal: number;
  subjectId: string;
  promptPayload: QuestionPromptPayload;
  promptText: string;
  instruction: string;
  answerSpec: {
    kind: AnswerKind;
    expectedEntityIds: string[];
    graderId: string;
    graderConfig: Record<string, unknown>;
    options?: QuestionChoice[];
  };
  feedback: {
    expectedLabel: string;
    targetCoordinates?: Coordinates;
    targetAreaId?: string;
    targetLineId?: string;
    explanation?: {
      text: string;
      evidence: KnowledgeEvidence[];
      sources: DatasetSource[];
    };
  };
  metadata: {
    promptKind: PromptKind;
    skillKey: string;
    regionId: string;
    entityType?: string;
    answerEntityType?: string;
    sourceDefinitionId?: string;
    sourcePoolId?: string;
    retryOfQuestionId?: string;
  };
}
