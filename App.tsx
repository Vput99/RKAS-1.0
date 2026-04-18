import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { getBudgets, addBudget, updateBudget, deleteBudget, getSchoolProfile, checkDatabaseConnection, clearLocalData } from './lib/db';
import { Budget, SchoolProfile } from './types';

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
  
  // PWA Install Prompt State
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
  const [data, setData] = useState<Budget[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

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
      console.log("Install prompt captured");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        setShowIOSPrompt(true);
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    } else {
        alert("Aplikasi mungkin sudah terinstall atau browser tidak mendukung instalasi otomatis.");
    }
  };

  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
        console.warn("Supabase not configured. Using Guest Mode.");
        setSession({ user: { email: 'guest@local' } });
        setAuthChecked(true);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && !dataLoadedRef.current) {
        // Handled by the session useEffect
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && !dataLoadedRef.current) {
        dataLoadedRef.current = true;
        fetchData();
        checkConnection();
        setupRealtimeSubscription();
    }
  }, [session]);

  const setupRealtimeSubscription = () => {
    if (!supabase) return;

    const channel = supabase!
      .channel('public:db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => { getBudgets().then(setData); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_profiles' }, () => { getSchoolProfile().then(setSchoolProfile); })
      .subscribe();

    return () => supabase!.removeChannel(channel);
  };

  const checkConnection = async () => {
    const status = await checkDatabaseConnection();
    setIsOnline(status);
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [budgets, profile] = await Promise.all([
      getBudgets(),
      getSchoolProfile()
    ]);
    setData(budgets);
    setSchoolProfile(profile);
    if (!silent) setLoading(false);
  };

  const handleAdd = async (item: Omit<Budget, 'id' | 'created_at'>) => {
    const newItem = await addBudget(item);
    if (newItem) setData(prev => prev.some(p => p.id === newItem.id) ? prev : [newItem, ...prev]);
  };

  const handleUpdate = async (id: string, updates: Partial<Budget>) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    try {
      const updatedItem = await updateBudget(id, updates);
      if (!updatedItem) fetchData(true);
    } catch (error) {
      console.error("Update failed:", error);
      fetchData(true);
    }
  };

  const handleDelete = async (id: string) => {
    const originalData = [...data];
    setData(prev => prev.filter(item => item.id !== id));
    const success = await deleteBudget(id);
    if (!success) setData(originalData);
  };

  const handleLogout = async () => {
      dataLoadedRef.current = false;
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

  if (!authChecked) {
      return <LoadingScreen />;
  }

  if (!session) {
      return <Auth onLoginSuccess={() => setSession({user: {email: 'guest'}})} />;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
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
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-4 lg:pb-6 pr-4 lg:pr-6 pt-4 lg:pt-6">
        <Header 
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          schoolProfile={schoolProfile}
          session={session}
          isOnline={isOnline}
        />

        <AppContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          data={data}
          schoolProfile={schoolProfile}
          loading={loading}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onProfileUpdate={(updated) => setSchoolProfile(updated)}
        />
      </main>

      <Suspense fallback={null}>
        <ChatAssistant budgets={data} />
      </Suspense>

      <InstallPrompt 
        showIOSPrompt={showIOSPrompt}
        setShowIOSPrompt={setShowIOSPrompt}
      />

      <Suspense fallback={null}>
        <SystemMonitor />
      </Suspense>
    </div>
  );
}

export default App;
