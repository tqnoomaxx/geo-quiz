export type AppRoute =
  | "/"
  | "/quiz"
  | "/results"
  | "/progress"
  | "/achievements"
  | "/account";

export function getHashRoute(): AppRoute {
  const route = window.location.hash.replace(/^#/, "") || "/";

  if (
    route === "/quiz" ||
    route === "/results" ||
    route === "/progress" ||
    route === "/achievements" ||
    route === "/account"
  ) {
    return route;
  }

  return "/";
}

export function navigate(route: AppRoute): void {
  window.location.hash = route;
}
