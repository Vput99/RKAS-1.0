import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { checkDatabaseConnection, clearLocalData } from './lib/db';
import { useBudgets, useAddBudget, useUpdateBudget, useDeleteBudget, useSchoolProfile } from './hooks/useRKASQueries';

// Layout Components
import Sidebar, { AppTab } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import AppContent from './components/layout/AppContent';
import LoadingScreen from './components/layout/LoadingScreen';
import InstallPrompt from './components/layout/InstallPrompt';

// Dynamic Components
import Auth from './components/Auth';
const ChatAssistant = lazy(() => import('./components/ChatAssistant'));
const SystemMonitor = lazy(() => import('./components/SystemMonitor'));

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
      const savedTab = localStorage.getItem('rkas_active_tab');
      const validTabs = ['dashboard', 'income', 'planning', 'spj', 'reports', 'rapor', 'settings', 'withdrawal', 'evidence', 'inventory', 'bku', 'letters'];
      return (savedTab && validTabs.includes(savedTab)) ? (savedTab as any) : 'dashboard';
  });

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // --- React Query Hooks ---
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: schoolProfile = null, isLoading: profileLoading } = useSchoolProfile();
  
  const addBudgetMutation = useAddBudget();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();

  useEffect(() => {
      localStorage.setItem('rkas_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!supabase) {
        setSession({ user: { email: 'guest@local' } });
        setAuthChecked(true);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      const status = await checkDatabaseConnection();
      setIsOnline(status);
    }
    if (session) checkConnection();
  }, [session]);

  const handleInstallClick = async () => {
    if (isIOS) setShowIOSPrompt(true);
    else if (deferredPrompt) {
        deferredPrompt.prompt();
        setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
      clearLocalData();
      if (supabase) await supabase.auth.signOut();
      window.location.reload(); 
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!authChecked) return <LoadingScreen />;
  if (!session) return <Auth onLoginSuccess={() => setSession({user: {email: 'guest'}})} />;

  return (
    <div className="flex flex-col h-screen bg-transparent overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isStandalone={isStandalone}
        deferredPrompt={deferredPrompt}
        isIOS={isIOS}
        handleInstallClick={handleInstallClick}
        handleLogout={handleLogout}
        session={session}
        isOnline={isOnline}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 lg:px-8 pb-8">
          <div className="max-w-[1600px] mx-auto pt-6">
            <AppContent 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              data={budgets}
              schoolProfile={schoolProfile}
              loading={budgetsLoading || profileLoading}
              onAdd={async (item) => { await addBudgetMutation.mutateAsync(item); }}
              onUpdate={async (id, updates) => { await updateBudgetMutation.mutateAsync({ id, updates }); }}
              onDelete={async (id) => { await deleteBudgetMutation.mutateAsync(id); }}
              onProfileUpdate={() => {}}
            />
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <ChatAssistant budgets={budgets} />
      </Suspense>

      <InstallPrompt showIOSPrompt={showIOSPrompt} setShowIOSPrompt={setShowIOSPrompt} />

      <Suspense fallback={null}>
        <SystemMonitor />
      </Suspense>
    </div>
  );
}

export default App;
