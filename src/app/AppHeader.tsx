import { Award, BookOpen, ChartNoAxesColumnIncreasing, UserRound } from "lucide-react";
import { BrandMark } from "../ui/BrandMark";
import { navigate, type AppRoute } from "./navigation";

interface AppHeaderProps {
  activeRoute?: AppRoute;
  compact?: boolean;
  progressLabel?: string;
  timerLabel?: string;
  onExitQuiz?: () => void;
}

export function AppHeader({
  activeRoute = "/",
  compact = false,
  progressLabel,
  timerLabel,
  onExitQuiz
}: AppHeaderProps) {
  return (
    <header className={`app-header${compact ? " app-header--compact" : ""}`}>
      <button
        className="brand"
        type="button"
        onClick={() => navigate("/")}
        aria-label="GeoApp Startseite"
      >
        <BrandMark className="brand__mark" />
        <span>GeoApp</span>
      </button>

      {compact ? (
        <div className="quiz-header-actions">
          {progressLabel ? (
            <span className="quiz-header-progress">{progressLabel}</span>
          ) : null}
          {timerLabel ? (
            <span className="quiz-header-timer" aria-live="polite">
              {timerLabel}
            </span>
          ) : null}
          {onExitQuiz ? (
            <button className="header-text-action" type="button" onClick={onExitQuiz}>
              Runde pausieren
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <nav className="main-nav" aria-label="Hauptnavigation">
            <button
              className={activeRoute === "/" ? "is-active" : ""}
              type="button"
              onClick={() => navigate("/")}
            >
              <BookOpen aria-hidden="true" />
              <span>Lernen</span>
            </button>
            <button
              className={activeRoute === "/progress" ? "is-active" : ""}
              type="button"
              onClick={() => navigate("/progress")}
            >
              <ChartNoAxesColumnIncreasing aria-hidden="true" />
              <span>Fortschritt</span>
            </button>
            <button
              className={activeRoute === "/achievements" ? "is-active" : ""}
              type="button"
              onClick={() => navigate("/achievements")}
            >
              <Award aria-hidden="true" />
              <span>Abzeichen</span>
            </button>
          </nav>
          <button
            className="header-text-action"
            type="button"
            onClick={() => navigate("/account")}
          >
            <UserRound aria-hidden="true" />
            <span>Anmelden</span>
          </button>
        </>
      )}
    </header>
  );
}
