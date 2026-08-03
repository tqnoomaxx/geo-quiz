import { describe, expect, it } from "vitest";
import knowledgeTemplateJson from "../../content-src/knowledge-templates.v1.json";
import { geoDataset } from "./dataset";
import {
  compileKnowledgeQuestions,
  parseRawKnowledgeTemplateSnapshot
} from "./knowledge";

const templateSnapshot = parseRawKnowledgeTemplateSnapshot(
  knowledgeTemplateJson
);
const compilerDataset = {
  entities: geoDataset.entities.filter(
    (entity) => entity.type !== "knowledge_question"
  ),
  names: geoDataset.names.filter(
    (name) => !name.entityId.startsWith("knowledge:")
  ),
  relations: geoDataset.relations.filter(
    (relation) =>
      relation.relationType !== "has_answer" &&
      !relation.sourceId.startsWith("knowledge:")
  ),
  factDefinitions: geoDataset.factDefinitions,
  facts: geoDataset.facts,
  sources: geoDataset.sources
};

function template(id: string) {
  const result = templateSnapshot.templates.find(
    (candidate) => candidate.id === id
  );
  if (!result) throw new Error(`Testvorlage ${id} fehlt.`);
  return result;
}

describe("Phase-6 Knowledge Compiler", () => {
  it("compiles the Portuguese ranking with an explicit evidence chain", () => {
    const result = compileKnowledgeQuestions(
      [template("official-portuguese-land-rank-2")],
      compilerDataset
    );

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      answerEntityId: "country:ao",
      promptDe:
        "Welches ist nach Landfläche das zweitgrößte Land, in dem Portugiesisch Amtssprache ist?",
      sourceRefs: expect.arrayContaining([
        "cplp-portuguese-language-states",
        "world-bank-land-area-2023"
      ])
    });
    expect(result.questions[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ labelDe: "Rang 1 · Brasilien" }),
        expect.objectContaining({ labelDe: "Rang 2 · Angola" }),
        expect.objectContaining({
          labelDe: "Amtssprache",
          valueDe: "Portugiesisch"
        })
      ])
    );
  });

  it("supports intersections, fact filters and relation answer paths", () => {
    const result = compileKnowledgeQuestions(
      [
        template("african-official-portuguese-land-rank-2"),
        template("africa-population-over-million-km2"),
        template("capital-south-america-land-rank-2")
      ],
      compilerDataset
    );

    expect(
      result.questions.map((question) => question.answerEntityId)
    ).toEqual(["country:et", "country:mz", "city:wd-q1486"]);
    expect(
      result.questions.find(
        (question) =>
          question.templateId === "africa-population-over-million-km2"
      )?.evidence
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelDe: "Landfläche",
          valueDe: "1.128.499 km²"
        })
      ])
    );
  });

  it("blocks missing values, mixed methods and non-unique ranks", () => {
    const rankingTemplate = template("official-portuguese-land-rank-2");
    const angolaFact = compilerDataset.facts.find(
      (fact) =>
        fact.entityId === "country:ao" &&
        fact.factTypeId === "fact-type:land-area-km2"
    );
    const mozambiqueFact = compilerDataset.facts.find(
      (fact) =>
        fact.entityId === "country:mz" &&
        fact.factTypeId === "fact-type:land-area-km2"
    );
    if (!angolaFact || !mozambiqueFact) throw new Error("Testfakten fehlen.");

    expect(() =>
      compileKnowledgeQuestions([rankingTemplate], {
        ...compilerDataset,
        facts: compilerDataset.facts.filter(
          (fact) => fact.id !== angolaFact.id
        )
      })
    ).toThrow(/keinen eindeutigen Ranking-Fakt/);

    expect(() =>
      compileKnowledgeQuestions([rankingTemplate], {
        ...compilerDataset,
        facts: compilerDataset.facts.map((fact) =>
          fact.id === angolaFact.id ? { ...fact, method: "andere Methode" } : fact
        )
      })
    ).toThrow(/mischt Quelle, Methode oder Bezugsdatum/);

    expect(() =>
      compileKnowledgeQuestions([rankingTemplate], {
        ...compilerDataset,
        facts: compilerDataset.facts.map((fact) =>
          fact.id === mozambiqueFact.id
            ? { ...fact, value: angolaFact.value }
            : fact
        )
      })
    ).toThrow(/Gleichstands nicht eindeutig/);

    const filterTemplate = template("africa-population-over-million-km2");
    const ethiopiaArea = compilerDataset.facts.find(
      (fact) =>
        fact.entityId === "country:et" &&
        fact.factTypeId === "fact-type:land-area-km2"
    );
    if (!ethiopiaArea) throw new Error("Filter-Testfakt fehlt.");
    expect(() =>
      compileKnowledgeQuestions([filterTemplate], {
        ...compilerDataset,
        facts: compilerDataset.facts.filter(
          (fact) => fact.id !== ethiopiaArea.id
        )
      })
    ).toThrow(/keinen eindeutigen Filterfakt/);
  });

  it("rejects operators outside the safe declarative language", () => {
    expect(() =>
      parseRawKnowledgeTemplateSnapshot({
        ...knowledgeTemplateJson,
        templates: [
          {
            ...knowledgeTemplateJson.templates[0],
            filter: { op: "script", code: "return process.env" }
          }
        ]
      })
    ).toThrow(/nicht erlaubt/);
  });
});
