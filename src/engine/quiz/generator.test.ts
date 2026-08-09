import { describe, expect, it } from "vitest";
import { geoDataset } from "../../content/dataset";
import { createContentRepository } from "../../content/repository";
import {
  validateQuizDefinition,
  type QuizDefinition
} from "./definition";
import { generateQuestions, selectQuizCandidates } from "./generator";
import {
  gradeQuestionAnswer,
  isCorrectTextQuestionAnswer
} from "../graders/registry";
import {
  createMvpQuizDefinition,
  DEFAULT_MVP_SETUP,
  MVP_REGIONS,
  type MvpQuizSetup
} from "./presets";

const repository = createContentRepository(geoDataset);

function definition(
  patch: Partial<MvpQuizSetup> = {}
) {
  return createMvpQuizDefinition({
    ...DEFAULT_MVP_SETUP,
    seed: "stable-seed",
    ...patch
  });
}

describe("Phase-2 QuizDefinition and deterministic generator", () => {
  it("validates all four MVP question/answer combinations", () => {
    const definitions = [
      definition({ topic: "capitals", direction: "locate" }),
      definition({ topic: "capitals", direction: "name" }),
      definition({ topic: "countries", direction: "locate" }),
      definition({ topic: "countries", direction: "name" })
    ];

    for (const candidate of definitions) {
      expect(validateQuizDefinition(candidate, geoDataset)).toMatchObject({
        success: true
      });
      expect(generateQuestions(candidate, repository)).toHaveLength(10);
    }
  });

  it("asks capitals by country and countries by capital with paired feedback", () => {
    const capitalFromCountry = definition({
      topic: "capitals",
      direction: "country_to_name",
      regionId: "world",
      questionCount: "all"
    });
    const countryFromCapital = definition({
      topic: "capitals",
      direction: "name_to_country",
      regionId: "world",
      questionCount: "all"
    });

    expect(validateQuizDefinition(capitalFromCountry, geoDataset)).toMatchObject({
      success: true
    });
    expect(validateQuizDefinition(countryFromCapital, geoDataset)).toMatchObject({
      success: true
    });

    const countryQuestions = generateQuestions(capitalFromCountry, repository);
    const capitalQuestions = generateQuestions(countryFromCapital, repository);
    const germany = countryQuestions.find(
      (question) => question.subjectId === "country:de"
    );
    const berlin = capitalQuestions.find(
      (question) => question.subjectId === "city:wd-q64"
    );
    const southAfrica = countryQuestions.find(
      (question) => question.subjectId === "country:za"
    );

    expect(germany).toMatchObject({
      promptText: "Wie heißt die Hauptstadt von Deutschland?",
      feedback: { expectedLabel: "Hauptstadt: Berlin · Land: Deutschland" },
      metadata: { answerEntityType: "city" }
    });
    expect(berlin).toMatchObject({
      promptText: "Zu welchem Land gehört Berlin?",
      feedback: { expectedLabel: "Land: Deutschland · Hauptstadt: Berlin" },
      metadata: { answerEntityType: "country" }
    });
    expect(southAfrica?.answerSpec.expectedEntityIds).toHaveLength(3);
    expect(southAfrica?.promptText).toBe(
      "Nenne einen Hauptstadtsitz von Südafrika."
    );
    expect(southAfrica?.feedback.expectedLabel).toBe(
      "Hauptstadtsitze: Bloemfontein, Kapstadt oder Pretoria · Land: Südafrika"
    );
    expect(
      gradeQuestionAnswer(
        southAfrica!,
        { kind: "text_input", value: "Pretoria" },
        1_000
      )
    ).toMatchObject({
      status: "correct",
      detail:
        "Hauptstadtsitze: Bloemfontein, Kapstadt oder Pretoria · Land: Südafrika"
    });
  });

  it("compiles and grades complete country profiles with valid alternatives", () => {
    const profileDefinition = definition({
      topic: "country-profile",
      direction: "profile",
      regionId: "world",
      questionCount: "all"
    });
    expect(validateQuizDefinition(profileDefinition, geoDataset)).toMatchObject({
      success: true
    });
    const questions = generateQuestions(profileDefinition, repository);
    expect(questions).toHaveLength(195);

    const germany = questions.find(
      (question) => question.subjectId === "country:de"
    )!;
    expect(germany).toMatchObject({
      promptText: "Was weißt du über Deutschland?",
      answerSpec: {
        kind: "country_profile_input",
        graderId: "country-profile-v1"
      },
      feedback: {
        expectedLabel:
          "Hauptstadt: Berlin · Amtssprache: Deutsch · Währung: Euro"
      }
    });
    expect(
      gradeQuestionAnswer(
        germany,
        {
          kind: "country_profile_input",
          values: {
            capital: "Berlin",
            language: "Deutsch",
            currency: "Euro"
          }
        },
        1_000
      )
    ).toMatchObject({
      status: "correct",
      score: 1,
      detail: "Alle drei Angaben stimmen."
    });

    const southAfrica = questions.find(
      (question) => question.subjectId === "country:za"
    )!;
    const partial = gradeQuestionAnswer(
      southAfrica,
      {
        kind: "country_profile_input",
        values: {
          capital: "Kapstadt",
          language: "Englisch",
          currency: "Euro"
        }
      },
      1_000
    );
    expect(partial).toMatchObject({ status: "partial", score: 0 });
    expect(partial.profileFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "capital", correct: true }),
        expect.objectContaining({ id: "currency", correct: false })
      ])
    );
  });

  it("compiles planets, moons, dwarf planets and configurable zodiac profiles", () => {
    const astronomyTopics = [
      ["planets", 8],
      ["moons", 20],
      ["dwarf-planets", 5]
    ] as const;

    for (const [topic, count] of astronomyTopics) {
      const candidate = definition({
        topic,
        direction: "facts_to_name",
        regionId: "world",
        questionCount: "all"
      });
      expect(validateQuizDefinition(candidate, geoDataset)).toMatchObject({
        success: true
      });
      const questions = generateQuestions(candidate, repository);
      expect(questions).toHaveLength(count);
      expect(questions[0]).toMatchObject({
        promptPayload: { kind: "fact" },
        answerSpec: { kind: "text_input", graderId: "text-v1" },
        metadata: { entityType: candidate.content.subjectType }
      });
    }

    const zodiac = definition({
      topic: "zodiac",
      direction: "profile",
      questionCount: "all",
      astronomyFieldIds: [
        "iau-abbreviation",
        "best-visibility",
        "sky-position"
      ]
    });
    expect(validateQuizDefinition(zodiac, geoDataset)).toMatchObject({
      success: true
    });
    const zodiacQuestions = generateQuestions(zodiac, repository);
    expect(zodiacQuestions).toHaveLength(12);
    const leo = zodiacQuestions.find(
      (question) => question.subjectId === "constellation:leo"
    )!;
    expect(leo).toMatchObject({
      promptText: "Welches Sternzeichen ist das?",
      promptPayload: {
        kind: "visual_asset",
        asset: { kind: "constellation_chart" }
      },
      answerSpec: {
        kind: "fact_profile_input",
        graderId: "fact-profile-v1"
      },
      feedback: {
        expectedLabel:
          "Name: Löwe · IAU-Kürzel: Leo · Beste Sichtbarkeit: April · Himmelslage: Nordhimmel"
      }
    });
    expect(leo.answerSpec.graderConfig.profileFields).toHaveLength(4);
    expect(
      gradeQuestionAnswer(
        leo,
        {
          kind: "fact_profile_input",
          values: {
            name: "Loewe",
            "iau-abbreviation": "LEO",
            "best-visibility": "04",
            "sky-position": "nördlich"
          }
        },
        1_000
      )
    ).toMatchObject({
      status: "correct",
      score: 1,
      detail: "Alle 4 Angaben stimmen."
    });
  });

  it("compiles all four Phase-4 visual combinations from presets", () => {
    const definitions = [
      definition({ topic: "flags", direction: "name" }),
      definition({ topic: "flags", direction: "choice" }),
      definition({ topic: "flags", direction: "reverse_choice" }),
      definition({ topic: "shapes", direction: "name" })
    ];

    for (const candidate of definitions) {
      expect(validateQuizDefinition(candidate, geoDataset)).toMatchObject({
        success: true
      });
      const questions = generateQuestions(candidate, repository);
      expect(questions).toHaveLength(10);
      expect(questions[0].metadata.sourceDefinitionId).toBe(candidate.id);
    }

    const flagChoice = generateQuestions(definitions[1], repository);
    expect(flagChoice[0].promptPayload.kind).toBe("visual_asset");
    expect(flagChoice[0].answerSpec.options).toHaveLength(4);
    expect(
      flagChoice[0].answerSpec.options?.map((option) => option.entityId)
    ).toContain(flagChoice[0].answerSpec.expectedEntityIds[0]);

    const reverse = generateQuestions(definitions[2], repository);
    expect(
      reverse[0].answerSpec.options?.every(
        (option) => option.visualAsset?.kind === "flag"
      )
    ).toBe(true);
  });

  it("rejects a mismatched dataset version", () => {
    const invalid = {
      ...definition(),
      datasetVersion: "other"
    };
    const result = validateQuizDefinition(invalid, geoDataset);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "dataset_mismatch" })
      );
    }
  });

  it("creates the same sequence for the same versioned seed", () => {
    const preset = definition();
    const first = generateQuestions(preset, repository, "stable-seed");
    const second = generateQuestions(preset, repository, "stable-seed");

    expect(first.map((question) => question.subjectId)).toEqual(
      second.map((question) => question.subjectId)
    );
    expect(first.map((question) => question.feedback.expectedLabel)).toEqual([
      "Athen",
      "Sofia",
      "Vatikanstadt",
      "Monaco",
      "Luxemburg",
      "Kiew",
      "Stockholm",
      "Moskau",
      "London",
      "Madrid"
    ]);
  });

  it("compiles all ten Phase-5 physical prompt-answer combinations", () => {
    const topics = [
      ["rivers", "map_line"],
      ["lakes", "map_area"],
      ["seas", "map_area"],
      ["mountain-ranges", "map_area"],
      ["peaks", "map_point"]
    ] as const;

    for (const [topic, locateKind] of topics) {
      const locate = definition({
        topic,
        direction: "locate",
        regionId: "world"
      });
      const name = definition({
        topic,
        direction: "name",
        regionId: "world"
      });
      expect(validateQuizDefinition(locate, geoDataset)).toMatchObject({
        success: true
      });
      expect(validateQuizDefinition(name, geoDataset)).toMatchObject({
        success: true
      });
      const locateQuestions = generateQuestions(locate, repository);
      const nameQuestions = generateQuestions(name, repository);
      expect(locateQuestions).toHaveLength(10);
      expect(nameQuestions).toHaveLength(10);
      expect(locateQuestions[0]).toMatchObject({
        answerSpec: { kind: locateKind },
        metadata: { entityType: locate.content.subjectType }
      });
      expect(nameQuestions[0]).toMatchObject({
        promptPayload: { kind: "map_highlight" },
        answerSpec: { kind: "text_input" }
      });
    }
  });

  it("compiles explainable Phase-6 knowledge puzzles for choice and text", () => {
    const choiceDefinition = definition({
      topic: "knowledge",
      direction: "choice",
      regionId: "world",
      questionCount: "all"
    });
    const textDefinition = definition({
      topic: "knowledge",
      direction: "name",
      regionId: "world"
    });
    const choiceQuestions = generateQuestions(
      choiceDefinition,
      repository,
      "knowledge-stable"
    );
    const textQuestions = generateQuestions(
      textDefinition,
      repository,
      "knowledge-stable"
    );

    expect(validateQuizDefinition(choiceDefinition, geoDataset)).toMatchObject({
      success: true
    });
    expect(choiceQuestions).toHaveLength(62);
    expect(textQuestions).toHaveLength(10);
    expect(
      new Set(choiceQuestions.map((question) => question.subjectId)).size
    ).toBe(choiceQuestions.length);
    expect(choiceQuestions[0]).toMatchObject({
      promptPayload: { kind: "description" },
      answerSpec: { kind: "single_choice" },
      feedback: {
        explanation: {
          text: expect.any(String),
          evidence: expect.any(Array),
          sources: expect.any(Array)
        }
      }
    });
    expect(choiceQuestions[0].answerSpec.options).toHaveLength(4);
    expect(
      choiceQuestions[0].answerSpec.options?.every((option) => {
        const entity = repository.getEntity(option.entityId);
        const expected = repository.getEntity(
          choiceQuestions[0].answerSpec.expectedEntityIds[0]
        );
        return entity?.type === expected?.type;
      })
    ).toBe(true);
    expect(textQuestions[0].answerSpec.kind).toBe("text_input");
    expect(
      isCorrectTextQuestionAnswer(
        textQuestions[0],
        textQuestions[0].feedback.expectedLabel
      )
    ).toBe(true);
    expect(isCorrectTextQuestionAnswer(textQuestions[0], "Atlantis")).toBe(
      false
    );

    const angola = choiceQuestions.find((question) =>
      question.promptText.includes("zweitgrößte Land")
    );
    expect(angola?.feedback.expectedLabel).toBe("Angola");
  });

  it("changes the sequence for a different seed", () => {
    const preset = definition();
    const first = generateQuestions(preset, repository, "seed-a");
    const second = generateQuestions(preset, repository, "seed-b");

    expect(first.map((question) => question.subjectId)).not.toEqual(
      second.map((question) => question.subjectId)
    );
  });

  it("exposes complete world and continent candidate scopes", () => {
    expect(
      selectQuizCandidates(
        definition({
          topic: "countries",
          regionId: "world",
          questionCount: "all"
        }),
        repository
      )
    ).toHaveLength(195);
    expect(
      selectQuizCandidates(
        definition({
          topic: "countries",
          regionId: "continent:europe",
          questionCount: "all"
        }),
        repository
      )
    ).toHaveLength(50);

    for (const region of MVP_REGIONS) {
      expect(
        selectQuizCandidates(
          definition({
            topic: "capitals",
            regionId: region.id,
            questionCount: "all"
          }),
          repository
        ).length
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("fails before the round when too few candidates exist", () => {
    const oversized: QuizDefinition = {
      ...definition(),
      rules: {
        ...definition().rules,
        questionCount: 999
      }
    };

    expect(() => generateQuestions(oversized, repository)).toThrow(
      /hat aber nur \d+ Kandidaten/
    );
  });
});
