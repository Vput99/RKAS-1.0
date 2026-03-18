import { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, Menu, User, BookOpen, FileBarChart, LogOut, Download, Share, PlusSquare, X, School, TrendingUp, Landmark, FileText, ShoppingBag } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import BudgetPlanning from './components/BudgetPlanning';
import SPJRealization from './components/SPJRealization';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ChatAssistant from './components/ChatAssistant';
import RaporPendidikan from './components/RaporPendidikan';
import BankWithdrawal from './components/BankWithdrawal';
import EvidenceTemplates from './components/EvidenceTemplates';
import InventoryReports from './components/InventoryReports'; // Import new component
import Auth from './components/Auth';
import BKU from './components/BKU';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'rapor' | 'settings' | 'withdrawal' | 'evidence' | 'inventory' | 'bku'>(() => {
      const savedTab = localStorage.getItem('rkas_active_tab');
      // Validate if saved tab is valid, otherwise default to dashboard
      const validTabs = ['dashboard', 'income', 'planning', 'spj', 'reports', 'rapor', 'settings', 'withdrawal', 'evidence', 'inventory', 'bku'];
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
        () => {
          getBudgets().then(setData);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_profiles' },
        () => {
          getSchoolProfile().then(setSchoolProfile);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
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
    if (newItem) {
      setData(prev => {
        if (prev.some(p => p.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Budget>) => {
    // Optimistic Update
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    
    try {
      const updatedItem = await updateBudget(id, updates);
      if (!updatedItem) {
        // If update failed, revert silently
        fetchData(true);
      }
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
      // 1. Clear Local Data to prevent leakage
      clearLocalData();
      
      // 2. Sign Out Supabase
      if (supabase) {
          await supabase.auth.signOut();
      }
      
      // 3. Force Reload to ensure complete state clearance
      // This is crucial to prevent "stale" data from being visible
      window.location.reload(); 
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
      <aside className={`fixed lg:relative z-30 w-72 h-full bg-white border-r border-slate-200/60 transition-all duration-500 ease-in-out flex flex-col shadow-2xl shadow-slate-200/50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[88px]'
      }`}>
        <div className="p-8 pb-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 flex-shrink-0 animate-scale-in">
            <School size={24} />
          </div>
          <div className={`transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:scale-90'}`}>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">RKAS Pintar</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Dashboard SD</p>
          </div>
        </div>

        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-hide py-2">
          <div className="space-y-1.5 focus-within:ring-0">
            <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
            <NavItem id="rapor" label="Rapor Pendidikan" icon={TrendingUp} />
            
            <div className={`pt-4 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manajemen Anggaran</span>
            </div>
            
            <NavItem id="income" label="Pendapatan" icon={Wallet} />
            <NavItem id="planning" label="Penganggaran" icon={BookOpen} />
            <NavItem id="withdrawal" label="Pencairan Bank" icon={Landmark} />
            
            <div className={`pt-4 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pelaksanaan & Stok</span>
            </div>

            <NavItem id="spj" label="Peng-SPJ-an" icon={FileCheck} />
            <NavItem id="evidence" label="Bukti Fisik" icon={FileText} />
            <NavItem id="inventory" label="Stok Opname" icon={ShoppingBag} />
            
            <div className={`pt-4 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0'}`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pelaporan</span>
            </div>

            <NavItem id="bku" label="BKU" icon={FileText} />
            <NavItem id="reports" label="Laporan" icon={FileBarChart} />
          </div>
          
          <div className="pt-8 mt-4 border-t border-slate-100 space-y-1.5 mb-6">
             {/* Install Button Logic */}
             {!isStandalone && (deferredPrompt || isIOS) && (
                <button
                  onClick={handleInstallClick}
                  className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 text-emerald-600 hover:bg-emerald-50 relative overflow-hidden group`}
                >
                  <Download size={20} className="relative z-10 group-hover:scale-110 transition-transform" />
                  <span className={`relative z-10 font-black text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>
                      {isIOS ? 'Cara Install' : 'Install App'}
                  </span>
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors"></div>
                </button>
             )}

             <button 
                onClick={() => { setActiveTab('settings'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 group ${
                  activeTab === 'settings' 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
             >
                <SettingsIcon size={20} className={`transition-transform duration-500 ${activeTab === 'settings' ? '' : 'group-hover:rotate-90'}`} />
                <span className={`font-bold text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Pengaturan</span>
             </button>
             
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 text-rose-500 hover:bg-rose-50 active:scale-95 group"
             >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className={`font-bold text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Keluar</span>
             </button>
          </div>
        </nav>

        {/* Version Indicator */}
        <div className={`p-6 text-center border-t border-slate-50 ${!isSidebarOpen && 'lg:hidden'}`}>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Ver 1.2.0 Stable</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-8 flex-shrink-0 z-10">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors lg:bg-slate-50 lg:hover:bg-slate-100"
          >
            <Menu size={22} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-6 ml-auto">
             <div className="text-right hidden md:block">
               <p className="text-sm font-black text-slate-800 tracking-tight">
                  {schoolProfile?.name || 'Sekolah Belum Terdaftar'}
               </p>
               <div className="flex items-center justify-end gap-3 text-[10px] font-bold mt-0.5">
                  <span className="text-slate-400 font-medium truncate max-w-[150px]">{session?.user?.email || 'Guest Mode'}</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-orange-500 shadow-sm shadow-orange-500/50'}`}></span>
                    <span className={`uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
               </div>
             </div>
             <div className="relative group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-tr from-slate-100 to-white rounded-2xl flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm group-hover:shadow-md transition-all group-hover:scale-105 active:scale-95 overflow-hidden">
                   <User size={24} />
                </div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
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
                {activeTab === 'evidence' && (
                  <EvidenceTemplates 
                    budgets={data}
                    onUpdate={handleUpdate}
                  />
                )}
                {activeTab === 'reports' && (
                  <Reports data={data} />
                )}
                {activeTab === 'inventory' && (
                  <InventoryReports budgets={data} />
                )}
                {activeTab === 'bku' && (
                  <BKU data={data} onBack={() => setActiveTab('dashboard')} />
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
