import { Menu, Search, Bell, User } from 'lucide-react';
import { AppTab } from './Sidebar';

interface HeaderProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: AppTab;
  session: any;
  isOnline: boolean;
}

const Header = ({
  isSidebarOpen,
  setSidebarOpen,
  activeTab,
  session,
  isOnline
}: HeaderProps) => {
  const userName = session?.user?.email?.split('@')[0] || 'Admin';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <header className="h-[80px] mb-6 flex items-center justify-between px-2 flex-shrink-0 z-40 transition-all duration-300">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2.5 hover:bg-white/60 glass-panel rounded-xl transition-all text-teal-800 shadow-sm"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <p className="text-[12px] font-bold text-slate-400 tracking-tight mb-0.5">Welcome back, {displayName} 👋</p>
          <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tight">
            {activeTab === 'spj' ? 'Pencatatan SPJ' :
             activeTab === 'bku' ? 'Buku Kas Umum' :
             activeTab === 'inventory' ? 'Stok Opname' :
             activeTab === 'letters' ? 'Pembuat Surat' :
             activeTab.replace('-', ' ')}
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
         <div className="hidden sm:flex items-center gap-2">
            <button className="p-2.5 text-slate-400 hover:text-teal-600 transition-colors">
              <Search size={20} strokeWidth={2.5} />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-teal-600 transition-colors relative">
              <Bell size={20} strokeWidth={2.5} />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
            </button>
         </div>

         <div className="flex items-center gap-3 pl-6 border-l border-teal-900/10">
            <div className="text-right hidden md:block">
              <p className="text-[13px] font-black text-[#015354] tracking-tight truncate max-w-[150px]">
                 {displayName}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                 <span className="text-[10px] font-black text-teal-600/40 uppercase tracking-widest">
                   {isOnline ? 'Online' : 'Offline'}
                 </span>
              </div>
            </div>
            
            <div className="relative group cursor-pointer">
               <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-teal-700 border border-white shadow-sm ring-4 ring-teal-500/5 group-hover:shadow-lg transition-all duration-300">
                  <User size={20} strokeWidth={2.5} />
               </div>
            </div>
         </div>
      </div>
    </header>
  );
};

export default Header;
