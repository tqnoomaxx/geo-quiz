import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type BrowserQuestion = {
  id: string;
  ordinal: number;
  promptPayload: {
    kind: string;
  };
  feedback: {
    expectedLabel: string;
    targetCoordinates?: readonly [number, number];
    targetAreaId?: string;
    targetLineId?: string;
  };
  answerSpec: {
    kind:
      | "text_input"
      | "single_choice"
      | "map_point"
      | "map_area"
      | "map_line";
    expectedEntityIds: string[];
    options?: Array<{ entityId: string }>;
  };
  metadata: {
    entityType?: string;
    sourcePoolId?: string;
    retryOfQuestionId?: string;
  };
};

type BrowserSession = {
  id: string;
  status: string;
  currentQuestionIndex: number;
  questions: BrowserQuestion[];
  attempts: Array<{
    ordinal: number;
    result: { status: string; responseLabel: string };
  }>;
};

async function indexedDbRequest<T>(
  page: Page,
  operation: "active-session" | "progress-events" | "phase3-state"
) {
  return page.evaluate(async (requestedOperation) => {
    const request = <T>(value: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        value.addEventListener("success", () => resolve(value.result), {
          once: true
        });
        value.addEventListener(
          "error",
          () => reject(value.error ?? new Error("IndexedDB request failed")),
          { once: true }
        );
      });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("geoapp", 3);
      open.addEventListener("success", () => resolve(open.result), {
        once: true
      });
      open.addEventListener(
        "error",
        () => reject(open.error ?? new Error("IndexedDB open failed")),
        { once: true }
      );
    });

    try {
      if (requestedOperation === "phase3-state") {
        const transaction = database.transaction(
          ["identity", "sync-outbox", "achievement-unlocks"],
          "readonly"
        );
        const [identity, outbox, unlocks] = await Promise.all([
          request(
            transaction.objectStore("identity").get("local-identity")
          ),
          request(transaction.objectStore("sync-outbox").getAll()),
          request(transaction.objectStore("achievement-unlocks").getAll())
        ]);
        return {
          stores: [...database.objectStoreNames],
          identity,
          outboxCount: Array.isArray(outbox) ? outbox.length : 0,
          unlockCount: Array.isArray(unlocks) ? unlocks.length : 0
        };
      }

      if (requestedOperation === "progress-events") {
        return await request(
          database
            .transaction("progress-events", "readonly")
            .objectStore("progress-events")
            .getAll()
        );
      }

      const meta = await request<{ key: string; value: string } | undefined>(
        database
          .transaction("meta", "readonly")
          .objectStore("meta")
          .get("active-session")
      );
      if (!meta) return undefined;
      return await request(
        database
          .transaction("sessions", "readonly")
          .objectStore("sessions")
          .get(meta.value)
      );
    } finally {
      database.close();
    }
  }, operation);
}

async function activeSession(page: Page) {
  await expect
    .poll(async () => {
      const session = await indexedDbRequest<BrowserSession | undefined>(
        page,
        "active-session"
      );
      return session?.questions.length ?? 0;
    })
    .toBeGreaterThan(0);

  return (await indexedDbRequest<BrowserSession | undefined>(
    page,
    "active-session"
  ))!;
}

async function currentQuestion(page: Page) {
  const session = await activeSession(page);
  return session.questions[session.currentQuestionIndex];
}

async function clickMapAt(
  page: Page,
  longitude: number,
  latitude: number
) {
  const canvas = page.locator(".quiz-map .maplibregl-canvas");
  await canvas.waitFor();
  const mapContainer = page.locator(".quiz-map .geo-map");

  await expect
    .poll(async () => Number(await mapContainer.getAttribute("data-map-zoom")))
    .not.toBeNaN();

  const projectedPosition = async () => {
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const zoom = Number(await mapContainer.getAttribute("data-map-zoom"));
    const centerLongitude = Number(
      await mapContainer.getAttribute("data-map-center-longitude")
    );
    const centerLatitude = Number(
      await mapContainer.getAttribute("data-map-center-latitude")
    );
    const worldSize = 512 * 2 ** zoom;
    const mercatorX = (value: number) => ((value + 180) / 360) * worldSize;
    const mercatorY = (value: number) => {
      const radians = (value * Math.PI) / 180;
      return (
        ((1 -
          Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
          2) *
        worldSize
      );
    };

    return {
      box: box!,
      zoom,
      x:
        box!.width / 2 +
        mercatorX(longitude) -
        mercatorX(centerLongitude),
      y:
        box!.height / 2 +
        mercatorY(latitude) -
        mercatorY(centerLatitude)
    };
  };

  let projected = await projectedPosition();
  for (let index = 0; index < 4; index += 1) {
    const isInside =
      projected.x >= 8 &&
      projected.x <= projected.box.width - 8 &&
      projected.y >= 8 &&
      projected.y <= projected.box.height - 8;
    if (isInside) break;

    const previousCenter = [
      await mapContainer.getAttribute("data-map-center-longitude"),
      await mapContainer.getAttribute("data-map-center-latitude")
    ].join(",");
    const startX = projected.box.x + projected.box.width / 2;
    const startY = projected.box.y + projected.box.height / 2;
    const deltaX = Math.max(
      projected.box.width * -0.4,
      Math.min(
        projected.box.width * 0.4,
        projected.box.width / 2 - projected.x
      )
    );
    const deltaY = Math.max(
      projected.box.height * -0.4,
      Math.min(
        projected.box.height * 0.4,
        projected.box.height / 2 - projected.y
      )
    );
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () =>
        [
          await mapContainer.getAttribute("data-map-center-longitude"),
          await mapContainer.getAttribute("data-map-center-latitude")
        ].join(",")
      )
      .not.toBe(previousCenter);
    projected = await projectedPosition();
  }

  expect(projected.x).toBeGreaterThanOrEqual(0);
  expect(projected.x).toBeLessThanOrEqual(projected.box.width);
  expect(projected.y).toBeGreaterThanOrEqual(0);
  expect(projected.y).toBeLessThanOrEqual(projected.box.height);

  await canvas.click({
    position: {
      x: projected.x,
      y: projected.y
    }
  });
}

async function configureAndStart(
  page: Page,
  setup: {
    topic:
      | "Länder"
      | "Hauptstädte"
      | "Große Städte"
      | "Flaggen"
      | "Länderformen"
      | "Flüsse"
      | "Seen"
      | "Meere"
      | "Gebirge"
      | "Gipfel"
      | "Längste Flüsse"
      | "Höchste Berge"
      | "Wissenspuzzle"
      | "Weltmix";
    mode:
      | "locate"
      | "name"
      | "country_to_name"
      | "name_to_country"
      | "choice"
      | "reverse_choice"
      | "facts_to_name"
      | "mix";
    region?: string;
    timer?: string;
    profile?: "learn" | "practice" | "exam";
    citySet?: "100" | "250" | "500" | "1000";
    questionCount?: "10" | "20" | "all";
  }
) {
  await page.goto("./");
  await page
    .getByRole("button", {
      name: new RegExp(`^${setup.topic}(?:\\s|$)`)
    })
    .click();
  await page.getByLabel("Fragerichtung").selectOption(setup.mode);
  await page.getByLabel("Lernmodus").selectOption(setup.profile ?? "learn");
  await page.getByLabel("Gebiet").selectOption(
    setup.region ?? "continent:europe"
  );
  if (setup.citySet) {
    await page.getByLabel("Stadtset").selectOption(setup.citySet);
  }
  await page.getByLabel("Fragen").selectOption(setup.questionCount ?? "10");
  const timerControl = page.getByLabel("Zeit pro Frage");
  if ((setup.profile ?? "learn") === "exam") {
    await timerControl.selectOption(setup.timer ?? "0");
  } else {
    await expect(timerControl).toBeDisabled();
    await expect(timerControl).toHaveValue("0");
  }
  await page.getByRole("button", { name: /^Quiz starten/ }).click();
  await expect(
    page.getByText(
      `1 / ${setup.questionCount === "all" ? setup.citySet : (setup.questionCount ?? "10")}`
    )
  ).toBeVisible();
}

async function answerCurrentQuestion(page: Page, correct = true) {
  const question = await currentQuestion(page);

  if (question.answerSpec.kind === "text_input") {
    await page
      .getByLabel("Deine Antwort")
      .fill(correct ? question.feedback.expectedLabel : "Atlantis");
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
  } else if (question.answerSpec.kind === "single_choice") {
    const expectedId = question.answerSpec.expectedEntityIds[0];
    const selectedId = correct
      ? expectedId
      : question.answerSpec.options?.find(
          (option: { entityId: string }) => option.entityId !== expectedId
        )?.entityId;
    expect(selectedId).toBeDefined();
    await page
      .locator(`.choice-option[data-entity-id="${selectedId}"]`)
      .click();
  } else if (question.answerSpec.kind === "map_line") {
    await expect(
      page.locator('.quiz-map .geo-map[data-physical-ready="true"]')
    ).toBeVisible();
    const coordinates = question.feedback.targetCoordinates;
    expect(coordinates).toBeDefined();
    await clickMapAt(
      page,
      correct ? coordinates![0] : 0,
      correct ? coordinates![1] : 0
    );
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ambiguous = page.getByText(
        "Mehrere Flüsse liegen hier nah beieinander. Zoome näher heran."
      );
      if (!(await ambiguous.isVisible())) break;
      const mapContainer = page.locator(".quiz-map .geo-map");
      const previousZoom = Number(
        await mapContainer.getAttribute("data-map-zoom")
      );
      await page.getByRole("button", { name: "Zoom in" }).click();
      await expect
        .poll(async () =>
          Number(await mapContainer.getAttribute("data-map-zoom"))
        )
        .toBeGreaterThan(previousZoom);
      await clickMapAt(page, coordinates![0], coordinates![1]);
    }
  } else {
    if (question.metadata.entityType) {
      await expect(
        page.locator('.quiz-map .geo-map[data-physical-ready="true"]')
      ).toBeVisible();
    }
    const coordinates = question.feedback.targetCoordinates;
    expect(coordinates).toBeDefined();
    await clickMapAt(
      page,
      correct ? coordinates![0] : 0,
      correct ? coordinates![1] : 0
    );
  }

  await expect(page.locator(".feedback-panel")).toBeVisible();
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("reveals paired capital and country solutions", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, {
    topic: "Hauptstädte",
    mode: "country_to_name",
    region: "continent:europe"
  });
  const question = await currentQuestion(page);

  await expect(page.getByLabel("Deine Antwort")).toHaveAttribute(
    "placeholder",
    "Hauptstadt eingeben"
  );
  await page.getByRole("button", { name: "Lösung anzeigen" }).click();
  await expect(page.locator(".feedback-panel.is-revealed")).toContainText(
    question.feedback.expectedLabel
  );
  await expect(page.getByText("Lösung", { exact: true })).toBeVisible();
  expect(question.feedback.expectedLabel).toContain(" · ");
  expect(consoleErrors).toEqual([]);
});

test("runs both global Top-100 fact quizzes with complete reveal feedback", async ({
  page
}) => {
  const consoleErrors = collectConsoleErrors(page);

  for (const topic of ["Längste Flüsse", "Höchste Berge"] as const) {
    await configureAndStart(page, {
      topic,
      mode: "facts_to_name",
      region: "world",
      questionCount: "10"
    });
    const question = await currentQuestion(page);

    expect(question.promptPayload.kind).toBe("fact");
    await expect(page.locator(".fact-question-card")).toBeVisible();
    await expect(page.locator(".fact-question-card dl > div")).toHaveCount(3);
    await expect(page.locator(".fact-question-rank")).toContainText("Rang");
    await page.getByRole("button", { name: "Lösung anzeigen" }).click();
    await expect(page.locator(".feedback-panel.is-revealed")).toContainText(
      question.feedback.expectedLabel
    );
    expect(question.feedback.expectedLabel).toContain(" · ");
  }

  expect(consoleErrors).toEqual([]);
});

test("asks for the country when given a capital name", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, {
    topic: "Hauptstädte",
    mode: "name_to_country",
    region: "continent:europe"
  });
  const question = await currentQuestion(page);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Zu welchem Land gehört"
  );
  await expect(page.getByLabel("Deine Antwort")).toHaveAttribute(
    "placeholder",
    "Land eingeben"
  );
  await page.getByRole("button", { name: "Lösung anzeigen" }).click();
  await expect(page.locator(".feedback-panel.is-revealed")).toContainText(
    question.feedback.expectedLabel
  );
  expect(question.feedback.expectedLabel).toContain(" · ");
  expect(consoleErrors).toEqual([]);
});

test("upgrades the Phase-2 browser schema without losing the guest profile", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      name: "Die Welt Schritt für Schritt lernen."
    })
  ).toBeVisible();

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase("geoapp");
      deletion.addEventListener("success", () => resolve(), { once: true });
      deletion.addEventListener(
        "error",
        () => reject(deletion.error ?? new Error("IndexedDB delete failed")),
        { once: true }
      );
    });

    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("geoapp", 2);
      open.addEventListener("upgradeneeded", () => {
        const database = open.result;
        database.createObjectStore("sessions", { keyPath: "id" });
        const meta = database.createObjectStore("meta", { keyPath: "key" });
        const progress = database.createObjectStore("progress-events", {
          keyPath: "id"
        });
        progress.createIndex("profileId", "profileId", { unique: false });
        progress.createIndex("entityId", "entityId", { unique: false });
        progress.createIndex("skillKey", "skillKey", { unique: false });
        database.createObjectStore("settings", { keyPath: "key" });
        database.createObjectStore("quarantine", { keyPath: "id" });
        meta.put({ key: "local-profile-id", value: "guest:legacy-phase2" });
      });
      open.addEventListener(
        "success",
        () => {
          open.result.close();
          resolve();
        },
        { once: true }
      );
      open.addEventListener(
        "error",
        () => reject(open.error ?? new Error("IndexedDB v2 setup failed")),
        { once: true }
      );
    });
  });

  await page.goto("./#/account");
  await expect(
    page.getByRole("heading", { name: "Dein Lernstand gehört dir." })
  ).toBeVisible();
  const phase3State = await indexedDbRequest<{
    stores: string[];
    identity: { localProfileId: string };
  }>(page, "phase3-state");

  expect(phase3State.identity.localProfileId).toBe("guest:legacy-phase2");
  expect(phase3State.stores).toEqual(
    expect.arrayContaining([
      "sessions",
      "progress-events",
      "identity",
      "sync-outbox",
      "achievement-unlocks",
      "sync-state"
    ])
  );
});

test("runs all four MVP prompt-answer combinations", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const setups = [
    { topic: "Hauptstädte", mode: "locate" },
    { topic: "Hauptstädte", mode: "name" },
    { topic: "Länder", mode: "locate" },
    { topic: "Länder", mode: "name" }
  ] as const;

  for (const setup of setups) {
    await configureAndStart(page, setup);
    const question = await currentQuestion(page);
    if (setup.topic === "Hauptstädte" && setup.mode === "name") {
      await expect(page.locator(".geo-map-highlight-marker")).toBeVisible();
    }
    await answerCurrentQuestion(page);
    await expect(page.locator(".feedback-panel")).toContainText("Richtig");
    expect(question.answerSpec.kind).toBe(
      setup.mode === "name"
        ? "text_input"
        : setup.topic === "Hauptstädte"
          ? "map_point"
          : "map_area"
    );
  }

  expect(consoleErrors).toEqual([]);
});

test("runs all four visual prompt-answer combinations", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  const setups = [
    { topic: "Flaggen", mode: "name", asset: ".visual-asset--flag" },
    { topic: "Flaggen", mode: "choice", asset: ".visual-asset--flag" },
    {
      topic: "Flaggen",
      mode: "reverse_choice",
      asset: ".choice-option .visual-asset--flag"
    },
    {
      topic: "Länderformen",
      mode: "name",
      asset: ".visual-asset--outline"
    }
  ] as const;

  for (const setup of setups) {
    await configureAndStart(page, setup);
    await expect(page.locator(setup.asset).first()).toBeVisible();
    await answerCurrentQuestion(page);
    await expect(page.locator(".feedback-panel")).toContainText("Richtig");
  }

  expect(consoleErrors).toEqual([]);
});

test("runs all ten physical-geography prompt-answer combinations", async (
  { page },
  testInfo
) => {
  testInfo.setTimeout(60_000);
  const consoleErrors = collectConsoleErrors(page);
  const setups = [
    { topic: "Flüsse", mode: "locate", answerKind: "map_line" },
    { topic: "Flüsse", mode: "name", answerKind: "text_input" },
    { topic: "Seen", mode: "locate", answerKind: "map_area" },
    { topic: "Seen", mode: "name", answerKind: "text_input" },
    { topic: "Meere", mode: "locate", answerKind: "map_area" },
    { topic: "Meere", mode: "name", answerKind: "text_input" },
    { topic: "Gebirge", mode: "locate", answerKind: "map_area" },
    { topic: "Gebirge", mode: "name", answerKind: "text_input" },
    { topic: "Gipfel", mode: "locate", answerKind: "map_point" },
    { topic: "Gipfel", mode: "name", answerKind: "text_input" }
  ] as const;

  for (const setup of setups) {
    await configureAndStart(page, {
      topic: setup.topic,
      mode: setup.mode,
      region: "world"
    });
    const question = await currentQuestion(page);
    await expect(
      page.locator('.geo-map[data-physical-ready="true"]')
    ).toBeVisible();
    await answerCurrentQuestion(page);
    await expect(page.locator(".feedback-panel")).toContainText("Richtig");
    expect(question.answerSpec.kind).toBe(setup.answerKind);
  }

  expect(consoleErrors).toEqual([]);
});

test("runs both knowledge modes and shows the compiled evidence chain", async ({
  page
}) => {
  const consoleErrors = collectConsoleErrors(page);

  for (const mode of ["choice", "name"] as const) {
    await configureAndStart(page, {
      topic: "Wissenspuzzle",
      mode,
      region: "world"
    });
    await expect(page.locator(".knowledge-question-card")).toBeVisible();
    await answerCurrentQuestion(page);
    await expect(page.locator(".knowledge-feedback")).toContainText("Richtig");
    await expect(
      page.getByRole("heading", { name: "So ergibt sich die Antwort" })
    ).toBeVisible();
    await expect(page.locator(".knowledge-explanation dl > div")).not.toHaveCount(0);
    await expect(page.locator(".knowledge-sources")).toContainText("Quellen");
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("loads, searches, pauses and resumes a Top-1000 city marathon", async ({
  page
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("./");
  await page.getByRole("button", { name: /^Große Städte(?:\s|$)/ }).click();
  await page.getByLabel("Gebiet").selectOption("world");
  await page.getByLabel("Stadtset").selectOption("1000");

  await expect(
    page.locator('.home-map-frame .geo-map[data-city-points="1000"]')
  ).toBeVisible();
  await expect(page.locator(".city-method-note")).toContainText(
    "GeoNames-Bevölkerungsfeld"
  );
  await expect(page.locator(".city-method-note")).toContainText(
    "Keine Metropolregionsrangliste"
  );
  await page.getByLabel("Stadt im Set suchen").fill("München");
  await expect(page.locator(".city-search__results")).toContainText("München");
  await expect(page.locator(".city-search__results")).toContainText("Rang 314");

  await page.getByLabel("Fragen").selectOption("all");
  await page.getByRole("button", { name: /^Quiz starten/ }).click();
  await expect(page.getByText("1 / 1000")).toBeVisible();
  const prepared = await activeSession(page);
  expect(prepared.questions).toHaveLength(1000);
  expect(prepared.questions[0].metadata.entityType).toBe("ranked_city");

  await page.getByRole("button", { name: "Runde pausieren" }).click();
  await expect(
    page.getByRole("button", { name: /Gespeicherte Runde fortsetzen/ })
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Gespeicherte Runde fortsetzen/ })
    .click();
  await expect(page.getByText("Gespeicherte Runde fortgesetzt")).toBeVisible();
  expect((await activeSession(page)).id).toBe(prepared.id);

  await answerCurrentQuestion(page);
  await expect(page.locator(".feedback-panel")).toContainText("Richtig");
  expect(consoleErrors).toEqual([]);
});

test("runs a world mix and an exam profile through their real transitions", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, {
    topic: "Weltmix",
    mode: "mix",
    region: "world"
  });
  const initial = await activeSession(page);
  expect(
    new Set(
      initial.questions.map(
        (question: BrowserQuestion) => question.metadata.sourcePoolId
      )
    )
  )
    .toEqual(
      new Set([
        "countries",
        "capitals",
        "flags",
        "shapes",
        "rivers",
        "lakes",
        "seas",
        "mountain-ranges",
        "peaks",
        "knowledge"
      ])
    );

  for (let index = 0; index < 10; index += 1) {
    await answerCurrentQuestion(page);
    await page
      .getByRole("button", {
        name: index === 9 ? "Ergebnis ansehen" : "Weiter"
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Runde abgeschlossen" })
  ).toBeVisible();
  await expect(page.getByText(/\d+ von 10 richtig/)).toBeVisible();

  await configureAndStart(page, {
    topic: "Flaggen",
    mode: "choice",
    profile: "exam",
    timer: "15"
  });
  await expect(page.getByRole("button", { name: "Lösung anzeigen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ohne Antwort weiter" }).click();
  await expect(page.getByText("2 / 10")).toBeVisible();
  await expect(page.locator(".feedback-panel")).toHaveCount(0);
  expect((await activeSession(page)).attempts[0].result.responseLabel).toBe(
    "Keine Antwort"
  );
  expect(consoleErrors).toEqual([]);
});

test("repeats missed questions once in practice mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, {
    topic: "Länder",
    mode: "name",
    profile: "practice",
    region: "continent:europe"
  });
  await expect(page.locator(".quiz-meta")).toContainText("Üben");
  const firstQuestion = await currentQuestion(page);

  for (let index = 0; index < 10; index += 1) {
    await answerCurrentQuestion(page, index !== 0);
    await page.getByRole("button", { name: "Weiter" }).click();
  }

  const retrySession = await activeSession(page);
  expect(retrySession.questions).toHaveLength(11);
  expect(retrySession.questions[10].metadata).toMatchObject({
    retryOfQuestionId: firstQuestion.id
  });
  await expect(page.getByText("11 / 11")).toBeVisible();
  await answerCurrentQuestion(page);
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByText("10 von 11 richtig")).toBeVisible();
  await expect(page.getByText("Keine offenen Fehler in dieser Runde.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fehler gezielt üben" })
  ).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("restores a confirmed area answer after reload", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, { topic: "Länder", mode: "locate" });
  const firstQuestion = await currentQuestion(page);
  await answerCurrentQuestion(page);
  await expect(page.locator(".feedback-panel")).toContainText("Richtig");
  await expect(page.getByText("Antwort lokal gespeichert")).toBeVisible();

  await page.reload();

  await expect(page.locator(".question-rail h1")).toBeVisible();
  expect((await currentQuestion(page)).id).toBe(firstQuestion.id);
  await expect(page.locator(".feedback-panel")).toContainText("Richtig");
  await expect(page.getByText("Gespeicherte Runde fortgesetzt")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("completes a round, stores progress and starts focused error training", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await configureAndStart(page, { topic: "Länder", mode: "name" });
  await expect(page.locator(".quiz-header-timer")).toHaveCount(0);

  for (let index = 0; index < 10; index += 1) {
    await answerCurrentQuestion(page, index !== 0);
    await page
      .getByRole("button", {
        name: index === 9 ? "Ergebnis ansehen" : "Weiter"
      })
      .click();
  }

  await expect(
    page.getByRole("heading", { name: "Runde abgeschlossen" })
  ).toBeVisible();
  await expect(page.getByText("9 von 10 richtig")).toBeVisible();
  await expect(page.getByText("Neu: Erste Runde")).toBeVisible();
  await expect
    .poll(async () => {
      const events = await indexedDbRequest<unknown[]>(
        page,
        "progress-events"
      );
      return events.length;
    })
    .toBe(10);

  await page.getByRole("button", { name: /Fehler gezielt üben/ }).click();
  await expect(page.getByText("1 / 1")).toBeVisible();
  await expect(page.locator(".quiz-header-timer")).toHaveCount(0);
  await answerCurrentQuestion(page);
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByText("1 von 1 richtig")).toBeVisible();

  await page.getByRole("button", { name: "Fortschritt" }).click();
  await expect(page.getByText("11", { exact: true })).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Abzeichen" }).click();
  const firstRoundBadge = page
    .locator(".badge-card")
    .filter({ hasText: "Erste Runde" });
  await expect(firstRoundBadge).toContainText("Freigeschaltet");
  const countryBadge = page
    .locator(".badge-card")
    .filter({ hasText: "Länderkenner · Bronze" });
  await expect(countryBadge).toContainText("Freigeschaltet");

  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(
    page.getByRole("heading", { name: "Dein Lernstand gehört dir." })
  ).toBeVisible();
  if (
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ) {
    await expect(
      page.getByRole("heading", { name: "Anmelden oder Konto erstellen" })
    ).toBeVisible();
  } else {
    await expect(
      page.getByText("Cloud-Sync ist noch nicht konfiguriert")
    ).toBeVisible();
  }

  const phase3State = await indexedDbRequest<{
    stores: string[];
    identity: {
      installationId: string;
      deviceId: string;
      localProfileId: string;
    };
    outboxCount: number;
    unlockCount: number;
  }>(page, "phase3-state");
  expect(phase3State.stores).toEqual(
    expect.arrayContaining([
      "identity",
      "sync-outbox",
      "achievement-unlocks",
      "sync-state"
    ])
  );
  expect(phase3State.identity.installationId).toBeTruthy();
  expect(phase3State.identity.deviceId).toBeTruthy();
  expect(phase3State.identity.localProfileId).toMatch(/^guest:/);
  expect(phase3State.outboxCount).toBe(11);
  expect(phase3State.unlockCount).toBe(2);
  expect(consoleErrors).toEqual([]);
});

test("loads the prepared app shell and starts a round offline", async ({
  page,
  context
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      name: "Die Welt Schritt für Schritt lernen."
    })
  ).toBeVisible();
  await expect(page.locator(".home-map-frame .maplibregl-canvas")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true }
        );
      });
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Die Welt Schritt für Schritt lernen."
    })
  ).toBeVisible();
  await page.getByRole("button", { name: /^Länder(?:\s|$)/ }).click();
  await page.getByLabel("Fragerichtung").selectOption("name");
  await page.getByRole("button", { name: /^Quiz starten/ }).click();
  await expect(page.getByLabel("Deine Antwort")).toBeVisible();
  await context.setOffline(false);
  expect(consoleErrors).toEqual([]);
});

test("restores a prepared visual round with its SVGs offline", async ({
  page,
  context
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      name: "Die Welt Schritt für Schritt lernen."
    })
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true }
        );
      });
    }
  });

  await page.getByRole("button", { name: /^Flaggen(?:\s|$)/ }).click();
  await page.getByLabel("Fragerichtung").selectOption("reverse_choice");
  await page.getByLabel("Gebiet").selectOption("continent:europe");
  await page.getByLabel("Fragen").selectOption("10");
  await page.getByRole("button", { name: /^Quiz starten/ }).click();
  await expect(
    page.locator(".choice-option .visual-asset--flag").first()
  ).toBeVisible();
  const preparedSession = await activeSession(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("1 / 10")).toBeVisible();
  await expect(
    page.locator(".choice-option .visual-asset--flag").first()
  ).toBeVisible();
  expect((await activeSession(page)).id).toBe(preparedSession.id);
  await context.setOffline(false);
  expect(consoleErrors).toEqual([]);
});

test("restores a prepared river round with its geometry offline", async ({
  page,
  context
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true }
        );
      });
    }
  });

  await page.getByRole("button", { name: /^Flüsse(?:\s|$)/ }).click();
  await page.getByLabel("Fragerichtung").selectOption("locate");
  await page.getByLabel("Gebiet").selectOption("world");
  await page.getByLabel("Fragen").selectOption("10");
  await page.getByRole("button", { name: /^Quiz starten/ }).click();
  await expect(
    page.locator('.quiz-map .geo-map[data-physical-ready="true"]')
  ).toBeVisible();
  const preparedSession = await activeSession(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("1 / 10")).toBeVisible();
  await expect(
    page.locator('.quiz-map .geo-map[data-physical-ready="true"]')
  ).toBeVisible();
  expect((await activeSession(page)).id).toBe(preparedSession.id);
  await answerCurrentQuestion(page);
  await expect(page.locator(".feedback-panel")).toContainText("Richtig");
  await context.setOffline(false);
  expect(consoleErrors).toEqual([]);
});

test("has no serious or critical accessibility violations on core screens", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("./");
  await expect(page.locator(".home-map-frame .maplibregl-canvas")).toBeVisible();

  const homeResults = await new AxeBuilder({ page }).analyze();
  expect(
    homeResults.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);

  await page.getByRole("button", { name: "Fortschritt" }).click();
  await expect(
    page.getByRole("heading", { name: "Dein lokaler Lernstand" })
  ).toBeVisible();
  const progressResults = await new AxeBuilder({ page }).analyze();
  expect(
    progressResults.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);

  await page.getByRole("button", { name: "Abzeichen" }).click();
  await expect(
    page.getByRole("heading", { name: "Abzeichen aus deinem Lernstand" })
  ).toBeVisible();
  const achievementResults = await new AxeBuilder({ page }).analyze();
  expect(
    achievementResults.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);

  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(
    page.getByRole("heading", { name: "Dein Lernstand gehört dir." })
  ).toBeVisible();
  const accountResults = await new AxeBuilder({ page }).analyze();
  expect(
    accountResults.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});
