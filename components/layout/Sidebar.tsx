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
    className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
      activeTab === id 
        ? 'text-white' 
        : 'text-teal-600/70 hover:text-teal-600 hover:bg-white/50'
    }`}
    title={label}
  >
    {activeTab === id && (
       <motion.div 
          layoutId="activeTabIndicator"
          className="absolute inset-0 coach-active-pill -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
       />
    )}
    <Icon size={19} className={`transition-transform duration-300 flex-shrink-0 ${activeTab === id ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'}`} />
    <span className={`text-[13px] font-bold tracking-tight whitespace-nowrap transition-opacity duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>{label}</span>
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
            className="fixed inset-0 bg-teal-900/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`fixed lg:relative z-50 transition-all duration-500 ease-spring h-full p-4 lg:p-6 lg:pr-3 flex flex-col ${
        isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0 lg:w-[124px]'
      }`}>
        <aside className="flex-1 w-full bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.03)] rounded-[32px] flex flex-col overflow-hidden relative">
          
          <div className="p-8 pb-10 flex items-center gap-4 relative z-10">
            <div className={`transition-all duration-300 flex items-center gap-3 ${!isSidebarOpen && 'lg:scale-90 lg:mx-auto'}`}>
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                <School size={22} strokeWidth={2.5} />
              </div>
              <h1 className={`text-xl font-extrabold text-[#015354] tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>RKAS Pintar</h1>
            </div>
          </div>

          <nav className="px-5 space-y-2 flex-1 overflow-y-auto scrollbar-hide py-2 pb-8 relative z-10">
            <div className="space-y-1.5">
              <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="rapor" label="Rapor Pendidikan" icon={TrendingUp} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-8 pb-3 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-teal-900/30 uppercase tracking-[0.25em]">Anggaran</span>
              </div>
              
              <NavItem id="income" label="Pendapatan BOS" icon={Wallet} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="planning" label="Penganggaran" icon={BookOpen} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="withdrawal" label="Pencairan" icon={Landmark} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-8 pb-3 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                <span className="text-[10px] font-black text-teal-900/30 uppercase tracking-[0.25em]">Aktivitas</span>
              </div>

              <NavItem id="spj" label="Pencatatan SPJ" icon={FileCheck} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="evidence" label="Manajemen Bukti" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="inventory" label="Stok Opname" icon={ShoppingBag} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="letters" label="Pembuat Surat" icon={FilePenLine} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              
              <div className={`pt-8 pb-3 px-4 transition-all duration-300 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                 <span className="text-[10px] font-black text-teal-900/30 uppercase tracking-[0.25em]">Laporan</span>
              </div>

              <NavItem id="bku" label="Buku Kas Umum" icon={FileText} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
              <NavItem id="reports" label="Laporan BOS" icon={FileBarChart} activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelect} />
            </div>
            
            <div className="pt-8 mt-6 border-t border-teal-900/5 space-y-2 mb-8">
               {(!isStandalone && (deferredPrompt || isIOS)) && (
                  <button
                    onClick={handleInstallClick}
                    className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3.5 rounded-2xl bg-[#ecf3f4] text-teal-700 hover:bg-teal-50 transition-all duration-300 border border-teal-100/50 group`}
                  >
                    <Download size={18} className="group-hover:animate-bounce flex-shrink-0" />
                    <span className={`font-bold text-[12px] tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Install App</span>
                  </button>
               )}

               <button 
                  onClick={() => onSelect('settings')}
                  className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all duration-300 group ${
                    activeTab === 'settings' 
                      ? 'bg-teal-900 text-white shadow-lg shadow-teal-950/20' 
                      : 'text-teal-600/60 hover:bg-white/50 hover:text-teal-600'
                  }`}
               >
                  <SettingsIcon size={18} className={`transition-transform duration-500 ${activeTab === 'settings' ? 'rotate-180' : 'group-hover:rotate-90'}`} />
                  <span className={`font-bold text-[12px] tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Pengaturan</span>
               </button>
               
               <button 
                  onClick={handleLogout}
                  className={`w-full flex items-center ${!isSidebarOpen ? 'lg:justify-center' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all duration-300 text-rose-500 hover:bg-rose-50/50 hover:text-rose-600 group`}
               >
                  <LogOut size={18} className="group-hover:-translate-x-1 transition-transform flex-shrink-0" />
                  <span className={`font-bold text-[12px] tracking-tight ${!isSidebarOpen && 'lg:hidden'}`}>Keluar Sesi</span>
               </button>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;

// Import BookOpen and FileBarChart as they are used in Sidebar
import { BookOpen, FileBarChart } from 'lucide-react';
