import { useState, useEffect, useRef, lazy, Suspense, memo } from 'react';
import { LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, Menu, User, BookOpen, FileBarChart, LogOut, Download, Share, PlusSquare, X, School, TrendingUp, Landmark, FileText, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Code Splitting - Lazy Load heavy components
const Dashboard = lazy(() => import('./components/Dashboard'));
const TransactionTable = lazy(() => import('./components/TransactionTable'));
const BudgetPlanning = lazy(() => import('./components/BudgetPlanning'));
const SPJRealization = lazy(() => import('./components/SPJRealization'));
const Reports = lazy(() => import('./components/Reports'));
const Settings = lazy(() => import('./components/Settings'));
const ChatAssistant = lazy(() => import('./components/ChatAssistant'));
const RaporPendidikan = lazy(() => import('./components/RaporPendidikan'));
const BankWithdrawal = lazy(() => import('./components/BankWithdrawal'));
const EvidenceTemplates = lazy(() => import('./components/EvidenceTemplates'));
const InventoryReports = lazy(() => import('./components/InventoryReports'));
const BKU = lazy(() => import('./components/BKU'));
const SystemMonitor = lazy(() => import('./components/SystemMonitor'));

import Auth from './components/Auth';
import { getBudgets, addBudget, updateBudget, deleteBudget, getSchoolProfile, checkDatabaseConnection, clearLocalData } from './lib/db';
import { supabase } from './lib/supabase';
import { Budget, TransactionType, SchoolProfile } from './types';

type AppTab = 'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'rapor' | 'settings' | 'withdrawal' | 'evidence' | 'inventory' | 'bku';

// Memoized NavItem to prevent unnecessary re-renders
const NavItem = memo(({ 
  id, 
  label, 
  icon: Icon, 
  activeTab, 
  isSidebarOpen, 
  onSelect 
}: { 
  id: AppTab, 
  label: string, 
  icon: any, 
  activeTab: AppTab, 
  isSidebarOpen: boolean, 
  onSelect: (id: AppTab) => void 
}) => (
  <button
    onClick={() => onSelect(id)}
    className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
      activeTab === id 
        ? 'text-indigo-700 font-bold' 
        : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
    }`}
    title={label}
  >
    {activeTab === id && (
       <motion.div 
          layoutId="activeTabIndicator"
          className="absolute inset-0 bg-indigo-100/80 backdrop-blur border border-indigo-200 shadow-sm rounded-2xl -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
       />
    )}
    <Icon size={20} className={`transition-transform duration-300 flex-shrink-0 ${activeTab === id ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'}`} />
    <span className={`font-semibold tracking-tight whitespace-nowrap transition-opacity duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>{label}</span>
  </button>
));

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
      const validTabs = ['dashboard', 'income', 'planning', 'spj', 'reports', 'rapor', 'settings', 'withdrawal', 'evidence', 'inventory', 'bku'];
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

  // Track if initial data has been loaded to prevent re-fetching on token refresh
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
      // Only refetch data on actual sign-in, NOT on token refresh
      // TOKEN_REFRESHED fires when tab regains focus — this was causing the "auto-refresh"
      if (event === 'SIGNED_IN' && !dataLoadedRef.current) {
        // Will be handled by the session useEffect below
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
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
           <div className="absolute inset-0 z-0">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-300/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
             <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
           </div>
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
             className="z-10 bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 flex flex-col items-center gap-4"
           >
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-indigo-900 font-bold text-lg animate-pulse">Memuat Aplikasi...</p>
           </motion.div>
        </div>
      );
  }

  if (!session) {
      return <Auth onLoginSuccess={() => setSession({user: {email: 'guest'}})} />;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Focus Area */}
      <div className={`fixed lg:relative z-50 transition-all duration-500 ease-spring h-full p-4 lg:p-6 lg:pr-3 flex flex-col ${
        isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0 lg:w-[124px]'
      }`}>
        <aside className="flex-1 w-full bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[32px] flex flex-col overflow-hidden relative">
          
          <div className="p-8 pb-6 flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 flex-shrink-0 animate-fade-in-up">
              <School size={28} className="drop-shadow-md" />
            </div>
            <div className={`transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:scale-90 hidden lg:block'}`}>
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-purple-800 tracking-tight">RKAS Pintar</h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-0.5">Dashboard SD</p>
            </div>
          </div>

          <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-hide py-2 pb-8 relative z-10">
            <div className="space-y-1">
              <NavItem id="dashboard" label="Dashboard Utama" icon={LayoutDashboard} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="rapor" label="Rapor Pendidikan" icon={TrendingUp} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">M. Anggaran</span>
              </div>
              
              <NavItem id="income" label="Pendapatan BOS" icon={Wallet} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="planning" label="Penganggaran RKAS" icon={BookOpen} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="withdrawal" label="Pencairan Bank" icon={Landmark} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Aktivitas</span>
              </div>

              <NavItem id="spj" label="Pencatatan SPJ" icon={FileCheck} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="evidence" label="Manajemen Bukti" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="inventory" label="Stok Opname" icon={ShoppingBag} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Pelaporan Resmi</span>
              </div>

              <NavItem id="bku" label="Buku Kas Umum" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
              <NavItem id="reports" label="Laporan BOS" icon={FileBarChart} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={(id: AppTab) => { setActiveTab(id); if (window.innerWidth < 1024) setSidebarOpen(false); }} />
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-200/50 space-y-2 mb-6">
               {(!isStandalone && (deferredPrompt || isIOS)) && (
                  <button
                    onClick={handleInstallClick}
                    className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group`}
                    title={isIOS ? 'Cara Install App' : 'Install Aplikasi'}
                  >
                    <Download size={20} className="group-hover:animate-bounce drop-shadow flex-shrink-0" />
                    <span className={`font-bold text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>
                        {isIOS ? 'Cara Install App' : 'Install Aplikasi'}
                    </span>
                  </button>
               )}

               <button 
                  onClick={() => { setActiveTab('settings'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                  className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3 rounded-2xl transition-all duration-300 group ${
                    activeTab === 'settings' 
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/30' 
                      : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
               >
                  <SettingsIcon size={20} className={`transition-transform duration-500 ${activeTab === 'settings' ? 'rotate-180' : 'group-hover:rotate-90'}`} />
                  <span className={`font-bold text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Pengaturan Sistem</span>
               </button>
               
               <button 
                  onClick={handleLogout}
                  className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3 rounded-2xl transition-all duration-300 text-rose-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 group`}
                  title="Keluar Sesi"
               >
                  <LogOut size={20} className="group-hover:-translate-x-1 transition-transform flex-shrink-0" />
                  <span className={`font-bold text-sm tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Keluar Sesi</span>
               </button>
            </div>
          </nav>

          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-indigo-50/40 pointer-events-none rounded-[32px]"></div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-4 lg:pb-6 pr-4 lg:pr-6 pt-4 lg:pt-6">
        
        {/* Floating Header */}
        <header className="h-[76px] mb-6 bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[28px] flex items-center justify-between px-6 flex-shrink-0 z-40 transition-all duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-100/80 hover:text-indigo-600 rounded-xl transition-colors text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 hidden md:block capitalize tracking-tight">
              {activeTab === 'spj' ? 'Pencatatan SPJ' : 
               activeTab === 'bku' ? 'Buku Kas Umum' :
               activeTab === 'inventory' ? 'Stok Opname' :
               activeTab.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-6 ml-auto">
             <div className="text-right hidden md:block">
               <p className="text-sm font-bold text-slate-800 tracking-tight">
                  {schoolProfile?.name || 'SDN Belum Diatur'}
               </p>
               <div className="flex items-center justify-end gap-3 text-[10px] font-bold mt-1">
                  <span className="text-slate-500 font-medium truncate max-w-[150px]">{session?.user?.email || 'Guest Mode'}</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-full border border-slate-200 shadow-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`}></span>
                    <span className={`uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
               </div>
             </div>
             
             <button className="relative group cursor-pointer" onClick={() => setActiveTab('settings')}>
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-700 border border-white shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300 group-hover:-translate-y-0.5 active:scale-95 overflow-hidden">
                   <User size={22} className="drop-shadow-sm" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
             </button>
          </div>
        </header>

        {/* Scrollable Main View Area */}
        <div className="flex-1 overflow-hidden relative rounded-[32px] bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)]">
          <div className="absolute inset-0 overflow-y-auto p-6 md:p-8 scrollbar-hide">
             <div className="max-w-7xl mx-auto h-full relative">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-400">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="font-bold tracking-widest uppercase text-xs animate-pulse">Memuat Data...</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <Suspense fallback={
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-400 animate-in fade-in zoom-in duration-500">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="font-bold tracking-widest uppercase text-xs animate-pulse">Menyiapkan Tampilan...</p>
                      </div>
                    }>
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.99 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="min-h-full pb-10"
                      >
                        {activeTab === 'dashboard' && <Dashboard data={data} profile={schoolProfile} />}
                        {activeTab === 'rapor' && <RaporPendidikan onAddBudget={handleAdd} budgetData={data} profile={schoolProfile} />}
                        {activeTab === 'income' && <TransactionTable type={TransactionType.INCOME} data={data} onAdd={handleAdd} onDelete={handleDelete} />}
                        {activeTab === 'planning' && <BudgetPlanning data={data} profile={schoolProfile} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete} />}
                        {activeTab === 'withdrawal' && <BankWithdrawal data={data} profile={schoolProfile} onUpdate={handleUpdate} />}
                        {activeTab === 'spj' && <SPJRealization data={data} profile={schoolProfile} onUpdate={handleUpdate} />}
                        {activeTab === 'evidence' && <EvidenceTemplates budgets={data} onUpdate={handleUpdate} />}
                        {activeTab === 'reports' && <Reports data={data} />}
                        {activeTab === 'inventory' && <InventoryReports budgets={data} schoolProfile={schoolProfile!} />}
                        {activeTab === 'bku' && <BKU data={data} profile={schoolProfile} onBack={() => setActiveTab('dashboard')} />}
                        {activeTab === 'settings' && <Settings onProfileUpdate={(updated) => setSchoolProfile(updated)} />}
                      </motion.div>
                    </Suspense>
                  </AnimatePresence>
                )}
             </div>
          </div>
        </div>
      </main>

      {/* AI Chat Bot */}
      <Suspense fallback={null}>
        <ChatAssistant budgets={data} />
      </Suspense>

      {/* IOS Install Instructions Modal */}
      <AnimatePresence>
        {showIOSPrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
             <motion.div 
               initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
               className="bg-white/90 backdrop-blur-xl border border-white rounded-[32px] w-full max-w-sm p-8 relative shadow-2xl"
             >
                <button 
                  onClick={() => setShowIOSPrompt(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:rotate-90 transition-transform bg-slate-100 p-2 rounded-full"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 border border-white shadow-inner">
                   <School size={32} />
                </div>
                <h3 className="font-black text-xl text-slate-800 mb-2 tracking-tight">Install di iPhone/iPad</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                  iOS tidak mendukung tombol install otomatis. Ikuti langkah manual berikut:
                </p>
                
                <ol className="space-y-4 text-sm text-slate-700 font-medium">
                   <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600">
                         <Share size={20} />
                      </div>
                      <span>1. Tekan tombol <b className="text-slate-900">Share</b> di bawah layar Safari.</span>
                   </li>
                   <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                         <PlusSquare size={20} />
                      </div>
                      <span className="flex-1">2. Geser ke bawah dan pilih <b className="text-slate-900">Add to Home Screen</b>.</span>
                   </li>
                   <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                         <span className="font-bold text-xs uppercase tracking-wider">Add</span>
                      </div>
                      <span>3. Tekan <b className="text-slate-900">Add</b> di pojok kanan atas.</span>
                   </li>
                </ol>

                <button 
                   onClick={() => setShowIOSPrompt(false)}
                   className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                   Mengerti, Tutup
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* System Resource Monitor */}
      <Suspense fallback={null}>
        <SystemMonitor />
      </Suspense>
    </div>
  );
}

export default App;


