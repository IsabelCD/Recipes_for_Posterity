import { useApp } from './state/AppStateContext';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { SignInPage } from './pages/SignInPage';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { FaqPage } from './pages/FaqPage';
import { SearchPage } from './pages/SearchPage';
import { RecipePage, RecipeBlockedPage } from './pages/RecipePage';
import { ContributePage } from './pages/ContributePage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { CupboardPage } from './pages/CupboardPage';
import { MyPage } from './pages/MyPage';
import { AdminPage } from './pages/AdminPage';
import { canSee, activeRecipe } from './state/selectors';

function CurrentPage() {
  const { state } = useApp();
  switch (state.page) {
    case 'signin': return <SignInPage />;
    case 'home': return <HomePage />;
    case 'about': return <AboutPage />;
    case 'faq': return <FaqPage />;
    case 'search': return <SearchPage />;
    case 'recipe':
      return canSee(state, activeRecipe(state)) ? <RecipePage /> : <RecipeBlockedPage />;
    case 'contribute': return <ContributePage />;
    case 'list': return <ShoppingListPage />;
    case 'cupboard': return <CupboardPage />;
    case 'me': return <MyPage />;
    case 'admin': return <AdminPage />;
    default: return null;
  }
}

export default function App() {
  return (
    <div className="print-shell app-shell">
      <Sidebar />
      <div className="print-content content">
        <CurrentPage />
      </div>
      <Toast />
    </div>
  );
}
