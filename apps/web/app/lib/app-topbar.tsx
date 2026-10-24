import { getSessionRole } from "./api";
import { AppTopbarView } from "./components";

// Server component: resolves the session itself so every page, including 404, shows the right auth state.
export async function AppTopbar(props: { showNavigation?: boolean; showCreateAction?: boolean }) {
  const role = await getSessionRole();
  return <AppTopbarView {...props} isAuthorized={role !== null} isAdmin={role === "admin"} />;
}
