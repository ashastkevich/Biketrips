import { hasActiveSession } from "./api";
import { AppTopbarView } from "./components";

// Server component: resolves the session itself so every page, including 404, shows the right auth state.
export async function AppTopbar(props: { showNavigation?: boolean; showCreateAction?: boolean }) {
  const isAuthorized = await hasActiveSession();
  return <AppTopbarView {...props} isAuthorized={isAuthorized} />;
}
