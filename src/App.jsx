import { useHrPortal } from "./hooks/useHrPortal";
import { AuthenticatedLayout } from "./layout/AuthenticatedLayout";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
  const app = useHrPortal();

  if (!app.token || !app.user) {
    return <LoginPage app={app} />;
  }

  return <AuthenticatedLayout app={app} />;
}
