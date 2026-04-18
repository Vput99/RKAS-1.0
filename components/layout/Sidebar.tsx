import { memo } from 'react';
import { 
  LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, LogOut, 
  Download, School, TrendingUp, Landmark, FileText, ShoppingBag, FilePenLine, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type AppTab = 'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'rapor' | 'settings' | 'withdrawal' | 'evidence' | 'inventory' | 'bku' | 'letters';

interface NavItemProps {
  id: AppTab;
  label: string;
  icon: any;
  activeTab: AppTab;
  isSidebarOpen: boolean;
  onSelect: (id: AppTab) => void;
}

const NavItem = memo(({ 
  id, 
  label, 
  icon: Icon, 
  activeTab, 
  isSidebarOpen, 
  onSelect 
}: NavItemProps) => (
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

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isStandalone: boolean;
  deferredPrompt: any;
  isIOS: boolean;
  handleInstallClick: () => void;
  handleLogout: () => void;
}

const Sidebar = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setSidebarOpen,
  isStandalone,
  deferredPrompt,
  isIOS,
  handleInstallClick,
  handleLogout
}: SidebarProps) => {
  const onSelect = (id: AppTab) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

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
              <NavItem id="dashboard" label="Dashboard Utama" icon={LayoutDashboard} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="rapor" label="Rapor Pendidikan" icon={TrendingUp} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">M. Anggaran</span>
              </div>
              
              <NavItem id="income" label="Pendapatan BOS" icon={Wallet} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="planning" label="Penganggaran RKAS" icon={BookOpen} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="withdrawal" label="Pencairan Bank" icon={Landmark} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Aktivitas</span>
              </div>

              <NavItem id="spj" label="Pencatatan SPJ" icon={FileCheck} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="evidence" label="Manajemen Bukti" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="inventory" label="Stok Opname" icon={ShoppingBag} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="letters" label="Pembuat Surat" icon={FilePenLine} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-6 pb-2 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Pelaporan Resmi</span>
              </div>

              <NavItem id="bku" label="Buku Kas Umum" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="reports" label="Laporan BOS" icon={FileBarChart} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
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
                  onClick={() => onSelect('settings')}
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
    </>
  );
};

export default Sidebar;

// Import BookOpen and FileBarChart as they are used in Sidebar
import { BookOpen, FileBarChart } from 'lucide-react';
