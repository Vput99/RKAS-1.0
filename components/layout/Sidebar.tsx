import { useState } from 'react';
import { 
  LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, LogOut, 
  School, TrendingUp, Landmark, FileText, ShoppingBag, FilePenLine,
  ChevronDown, Bell, Search, User, Menu, BookOpen, FileBarChart, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type AppTab = 'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'rapor' | 'settings' | 'withdrawal' | 'evidence' | 'inventory' | 'bku' | 'letters';

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
  session: any;
  isOnline: boolean;
}

const Sidebar = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setSidebarOpen,
  handleLogout,
  session,
  isOnline
}: SidebarProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const userName = session?.user?.email?.split('@')[0] || 'Admin';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const groups = [
    { 
      name: 'Utama', 
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'rapor', label: 'Rapor Pendidikan', icon: TrendingUp },
      ]
    },
    { 
      name: 'Anggaran', 
      items: [
        { id: 'income', label: 'Pendapatan BOS', icon: Wallet },
        { id: 'planning', label: 'Penyusunan RKAS', icon: BookOpen },
        { id: 'withdrawal', label: 'Pencairan Dana', icon: Landmark },
      ]
    },
    { 
      name: 'Realisasi', 
      items: [
        { id: 'spj', label: 'Pencatatan SPJ', icon: FileCheck },
        { id: 'evidence', label: 'Manajemen Bukti', icon: FileText },
        { id: 'inventory', label: 'Stok Opname', icon: ShoppingBag },
        { id: 'letters', label: 'Pembuat Surat', icon: FilePenLine },
      ]
    },
    { 
      name: 'Laporan', 
      items: [
        { id: 'bku', label: 'Buku Kas Umum', icon: FileText },
        { id: 'reports', label: 'Pelaporan BOS', icon: FileBarChart },
      ]
    }
  ];

  return (
    <nav className="w-full glass-panel border-b border-white/60 sticky top-0 z-[60] px-4 lg:px-8 h-20 flex items-center justify-between shadow-sm">
      {/* Left: Logo */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 btn-primary-glass rounded-xl flex items-center justify-center text-white shadow-lg">
            <School size={22} strokeWidth={2.5} />
          </div>
          <div className="hidden xl:block">
            <h1 className="text-lg font-black text-slate-900 leading-none">RKAS <span className="text-teal-600">Pintar</span></h1>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest text-left">Digital School App</p>
          </div>
        </div>

        {/* Center: Main Nav */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          {groups.map((group) => (
            <div key={group.name} className="relative group" onMouseEnter={() => setActiveMenu(group.name)} onMouseLeave={() => setActiveMenu(null)}>
              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  group.items.some(i => i.id === activeTab) 
                  ? 'bg-white text-teal-600 shadow-sm' 
                  : 'text-slate-500 hover:text-teal-600'
                }`}
              >
                {group.name}
                <ChevronDown size={14} className={`transition-transform duration-300 ${activeMenu === group.name ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeMenu === group.name && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as AppTab); setActiveMenu(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                          activeTab === item.id 
                          ? 'bg-teal-50 text-teal-600' 
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon size={18} className={activeTab === item.id ? 'animate-pulse' : ''} />
                        <span className="text-sm font-bold">{item.label}</span>
                        {activeTab === item.id && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${
              activeTab === 'settings' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-teal-600'
            }`}
          >
            <SettingsIcon size={16} />
            Setelan
          </button>
        </div>
      </div>

      {/* Right: User Section */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-slate-200">
           <button className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
             <Search size={20} />
           </button>
           <button className="p-2 text-slate-400 hover:text-teal-600 transition-colors relative">
             <Bell size={20} />
             <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
           </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-slate-900 leading-none">{displayName}</p>
            <div className="flex items-center justify-end gap-1.5 mt-1">
               <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                 {isOnline ? 'Online' : 'Offline'}
               </span>
            </div>
          </div>
          
          <div className="relative group">
             <button className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <User size={20} />
             </button>
             <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-bold text-sm text-left font-sans">
                   <LogOut size={18} />
                   Keluar Sesi
                </button>
             </div>
          </div>
          
          <button className="lg:hidden p-2 text-slate-600" onClick={() => setSidebarOpen(true)}>
             <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-[80] lg:hidden p-6 flex flex-col shadow-2xl rounded-r-[32px]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 btn-primary-glass rounded-xl flex items-center justify-center text-white">
                    <School size={22} />
                  </div>
                  <span className="font-black text-slate-900">RKAS Pintar</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
                {groups.map(group => (
                  <div key={group.name} className="animate-fade-in-up">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{group.name}</h3>
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id as AppTab); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                            activeTab === item.id ? 'bg-teal-50 text-teal-600' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
                <button 
                  onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'settings' ? 'bg-teal-50 text-teal-600' : 'text-slate-600'}`}
                >
                  <SettingsIcon size={18} /> Pengaturan
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-rose-500 hover:bg-rose-50">
                   <LogOut size={18} /> Keluar Sesi
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden flex justify-around items-center h-16 px-2 z-[60] shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] pb-safe">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'income', label: 'BOS', icon: Wallet },
          { id: 'spj', label: 'SPJ', icon: FileCheck },
          { id: 'reports', label: 'Laporan', icon: FileBarChart },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AppTab)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${
              activeTab === item.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'animate-bounce' : ''} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 text-slate-400 hover:text-slate-600`}
        >
          <Menu size={20} />
          <span className="text-[10px] font-bold">Lainnya</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
