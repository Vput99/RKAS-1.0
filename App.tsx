
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, Menu, User, BookOpen, FileBarChart, Wifi, LogOut, Download, Share, PlusSquare, X, School, TrendingUp, Landmark } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import BudgetPlanning from './components/BudgetPlanning';
import SPJRealization from './components/SPJRealization';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ChatAssistant from './components/ChatAssistant';
import RaporPendidikan from './components/RaporPendidikan';
import BankWithdrawal from './components/BankWithdrawal';
import Auth from './components/Auth';
import { getBudgets, addBudget, updateBudget, deleteBudget, getSchoolProfile, checkDatabaseConnection, clearLocalData } from './lib/db';
import { supabase } from './lib/supabase'; // Import supabase client
import { Budget, TransactionType, SchoolProfile } from './types';

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // App State - Initialize from LocalStorage to persist state on reload
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'rapor' | 'settings' | 'withdrawal'>(() => {
      const savedTab = localStorage.getItem('rkas_active_tab');
      // Validate if saved tab is valid, otherwise default to dashboard
      const validTabs = ['dashboard', 'income', 'planning', 'spj', 'reports', 'rapor', 'settings', 'withdrawal'];
      return (savedTab && validTabs.includes(savedTab)) ? (savedTab as any) : 'dashboard';
  });

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<Budget[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // --- PERSIST ACTIVE TAB ---
  // Whenever activeTab changes, save it to localStorage
  useEffect(() => {
      localStorage.setItem('rkas_active_tab', activeTab);
  }, [activeTab]);

  // --- PWA INSTALL LISTENER ---
  useEffect(() => {
    // 1. Check if running in standalone (already installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // 2. Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for Android/Desktop install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("Install prompt captured");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        // Show manual instruction for iOS
        setShowIOSPrompt(true);
    } else if (deferredPrompt) {
        // Android/Desktop: Show native prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    } else {
        alert("Aplikasi mungkin sudah terinstall atau browser tidak mendukung instalasi otomatis.");
    }
  };

  // --- AUTH CHECK ---
  useEffect(() => {
    if (!supabase) {
        // Offline/Demo Mode: Auto login as Guest
        console.warn("Supabase not configured. Using Guest Mode.");
        setSession({ user: { email: 'guest@local' } });
        setAuthChecked(true);
        return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DATA LOADING (Only if session exists) ---
  useEffect(() => {
    if (session) {
        fetchData();
        checkConnection();
        setupRealtimeSubscription();
    }
  }, [session]);

  const setupRealtimeSubscription = () => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        (payload) => {
          console.log('Realtime update received (Budgets):', payload);
          getBudgets().then(setData);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_profiles' },
        (payload) => {
          getSchoolProfile().then(setSchoolProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkConnection = async () => {
    const status = await checkDatabaseConnection();
    setIsOnline(status);
  }

  const fetchData = async () => {
    setLoading(true);
    const [budgets, profile] = await Promise.all([
      getBudgets(),
      getSchoolProfile()
    ]);
    setData(budgets);
    setSchoolProfile(profile);
    setLoading(false);
  };

  const handleAdd = async (item: Omit<Budget, 'id' | 'created_at'>) => {
    const newItem = await addBudget(item);
    if (newItem) {
      setData(prev => {
        if (prev.some(p => p.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Budget>) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    const updatedItem = await updateBudget(id, updates);
    if (!updatedItem) fetchData();
  };

  const handleDelete = async (id: string) => {
    const originalData = [...data];
    setData(prev => prev.filter(item => item.id !== id));
    const success = await deleteBudget(id);
    if (!success) setData(originalData);
  };

  const handleLogout = async () => {
      // 1. Clear Local Data to prevent leakage
      clearLocalData();
      
      // 2. Sign Out Supabase
      if (supabase) {
          await supabase.auth.signOut();
      }
      
      // 3. Reset State
      setActiveTab('dashboard');
      setSession(null);
      setData([]);
      setSchoolProfile(null);
  };

  // Mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // --- RENDER ---
  
  if (!authChecked) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Memuat...</div>;
  }

  if (!session) {
      return <Auth onLoginSuccess={() => setSession({user: {email: 'guest'}})} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-30 w-64 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 xl:w-64'
      }`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between lg:justify-center xl:justify-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
            <School size={22} />
          </div>
          <span className={`text-xl font-bold text-gray-800 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
            RKAS Pintar
          </span>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
            <NavItem id="rapor" label="Rapor Pendidikan" icon={TrendingUp} />
            <NavItem id="income" label="Pendapatan" icon={Wallet} />
            <NavItem id="planning" label="Penganggaran" icon={BookOpen} />
            <NavItem id="withdrawal" label="Pencairan Bank" icon={Landmark} />
            <NavItem id="spj" label="Peng-SPJ-an" icon={FileCheck} />
            <NavItem id="reports" label="Laporan" icon={FileBarChart} />
          </div>
          
          <div className="pt-4 mt-auto border-t border-gray-100 space-y-2">
             {/* Install Button Logic */}
             {!isStandalone && (deferredPrompt || isIOS) && (
                <button
                  onClick={handleInstallClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-green-600 hover:bg-green-50 animate-pulse`}
                >
                  <Download size={20} />
                  <span className={`${!isSidebarOpen && 'lg:hidden xl:block'} font-bold`}>
                      {isIOS ? 'Cara Install (iOS)' : 'Install Aplikasi'}
                  </span>
                </button>
             )}

             <button 
                onClick={() => { setActiveTab('settings'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === 'settings' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
             >
                <SettingsIcon size={20} />
                <span className={`${!isSidebarOpen && 'lg:hidden xl:block'} font-medium`}>Pengaturan</span>
             </button>
             
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50"
             >
                <LogOut size={20} />
                <span className={`${!isSidebarOpen && 'lg:hidden xl:block'} font-medium`}>Keluar</span>
             </button>
          </div>
        </nav>

        {/* Version Indicator */}
        <div className={`p-4 text-center border-t border-gray-100 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
            <p className="text-[10px] text-gray-400">Versi Aplikasi 1.2</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu size={24} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-gray-800">
                  {schoolProfile?.name || 'Nama Sekolah Belum Diatur'}
               </p>
               <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                  <span>{session?.user?.email || 'Guest'}</span>
                  <span className="text-gray-300">|</span>
                  <span className={`flex items-center gap-1 font-medium ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    {isOnline ? 'Cloud' : 'Lokal'}
                  </span>
               </div>
             </div>
             <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 border border-gray-100">
               <User size={20} />
             </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard data={data} profile={schoolProfile} />}
                {activeTab === 'rapor' && (
                  <RaporPendidikan onAddBudget={handleAdd} budgetData={data} />
                )}
                {activeTab === 'income' && (
                  <TransactionTable 
                    type={TransactionType.INCOME} 
                    data={data} 
                    onAdd={handleAdd} 
                    onDelete={handleDelete}
                  />
                )}
                {activeTab === 'planning' && (
                  <BudgetPlanning 
                    data={data} 
                    onAdd={handleAdd}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                )}
                {activeTab === 'withdrawal' && (
                  <BankWithdrawal 
                    data={data}
                    profile={schoolProfile}
                    onUpdate={handleUpdate}
                  />
                )}
                {activeTab === 'spj' && (
                  <SPJRealization 
                    data={data}
                    onUpdate={handleUpdate}
                  />
                )}
                {activeTab === 'reports' && (
                  <Reports data={data} />
                )}
                {activeTab === 'settings' && (
                  <Settings 
                    onProfileUpdate={(updated) => setSchoolProfile(updated)} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* AI Chat Bot */}
      <ChatAssistant budgets={data} />

      {/* IOS Install Instructions Modal */}
      {showIOSPrompt && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-sm p-6 relative animate-fade-in-up">
               <button 
                 onClick={() => setShowIOSPrompt(false)}
                 className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
               >
                 <X size={20} />
               </button>
               <h3 className="font-bold text-lg text-gray-800 mb-2">Install di iPhone/iPad</h3>
               <p className="text-sm text-gray-600 mb-4">
                 iOS tidak mendukung tombol install otomatis. Ikuti langkah manual berikut:
               </p>
               
               <ol className="space-y-4 text-sm text-gray-700">
                  <li className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-blue-600">
                        <Share size={18} />
                     </div>
                     <span>1. Tekan tombol <b>Share</b> di bawah layar Safari.</span>
                  </li>
                  <li className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-600">
                        <PlusSquare size={18} />
                     </div>
                     <span>2. Geser ke bawah dan pilih <b>Add to Home Screen</b> (Tambah ke Layar Utama).</span>
                  </li>
                  <li className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-600">
                        <span className="font-bold">Add</span>
                     </div>
                     <span>3. Tekan <b>Add</b> di pojok kanan atas.</span>
                  </li>
               </ol>

               <button 
                  onClick={() => setShowIOSPrompt(false)}
                  className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg font-bold"
               >
                  Saya Mengerti
               </button>
            </div>
         </div>
      )}

    </div>
  );
}

export default App;
