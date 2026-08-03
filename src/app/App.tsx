import { lazy, Suspense } from "react";
import { HomePage } from "../features/home/HomePage";
import { QuizPage } from "../features/quiz/QuizPage";
import { ProgressPage } from "../features/progress/ProgressPage";
import { ResultsPage } from "../features/results/ResultsPage";
import { useHashRoute } from "./useHashRoute";

const AchievementsPage = lazy(() =>
  import("../features/achievements/AchievementsPage").then((module) => ({
    default: module.AchievementsPage
  }))
);
const AccountPage = lazy(() =>
  import("../features/account/AccountPage").then((module) => ({
    default: module.AccountPage
  }))
);

function LazyPageFallback() {
  return (
    <main className="results-empty" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <h1>Ansicht wird geladen</h1>
    </main>
  );
}

export function App() {
  const route = useHashRoute();

  if (route === "/quiz") {
    return <QuizPage />;
  }

  if (route === "/results") {
    return <ResultsPage />;
  }

  if (route === "/progress") {
    return <ProgressPage />;
  }

  if (route === "/achievements") {
    return (
      <Suspense fallback={<LazyPageFallback />}>
        <AchievementsPage />
      </Suspense>
    );
  }

  if (route === "/account") {
    return (
      <Suspense fallback={<LazyPageFallback />}>
        <AccountPage />
      </Suspense>
    );
  }

  return <HomePage />;
}
