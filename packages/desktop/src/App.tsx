import { useAuth } from "./lib/auth.js";
import { useRoute } from "./lib/router.js";
import { Layout } from "./components/Layout.js";
import { LoginScreen } from "./screens/LoginScreen.js";
import { DashboardScreen } from "./screens/DashboardScreen.js";
import { NewBillScreen } from "./screens/NewBillScreen.js";
import { BookingsScreen } from "./screens/BookingsScreen.js";
import { InvoicesScreen } from "./screens/InvoicesScreen.js";
import { InvoiceDetailScreen } from "./screens/InvoiceDetailScreen.js";
import { RoomsScreen } from "./screens/RoomsScreen.js";
import { MenuScreen } from "./screens/MenuScreen.js";
import { GuestsScreen } from "./screens/GuestsScreen.js";
import { ReportsScreen } from "./screens/ReportsScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";

export function App() {
  const { user, loading } = useAuth();
  const { segments } = useRoute();

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-mark">SP</div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const [root, param, param2] = segments;
  let screen: JSX.Element;
  switch (root) {
    case undefined:
    case "":
    case "dashboard":
      screen = <DashboardScreen />;
      break;
    case "new-bill":
      screen = <NewBillScreen stayId={param} initialMode={param2} />;
      break;
    case "bookings":
      screen = <BookingsScreen />;
      break;
    case "invoices":
      screen = param ? <InvoiceDetailScreen id={param} /> : <InvoicesScreen />;
      break;
    case "rooms":
      screen = <RoomsScreen />;
      break;
    case "menu":
      screen = <MenuScreen />;
      break;
    case "guests":
      screen = <GuestsScreen />;
      break;
    case "reports":
      screen = <ReportsScreen />;
      break;
    case "settings":
      screen = <SettingsScreen />;
      break;
    default:
      screen = <DashboardScreen />;
  }

  return <Layout active={root ?? "dashboard"}>{screen}</Layout>;
}
