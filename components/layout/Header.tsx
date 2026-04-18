import { Menu, User } from 'lucide-react';
import { SchoolProfile } from '../../types';
import { AppTab } from './Sidebar';

interface HeaderProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: AppTab;
  schoolProfile: SchoolProfile | null;
  session: any;
  isOnline: boolean;
}

const Header = ({
  isSidebarOpen,
  setSidebarOpen,
  activeTab,
  schoolProfile,
  session,
  isOnline
}: HeaderProps) => {
  return (
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
           activeTab === 'letters' ? 'Pembuat Surat (MOU/SPK)' :
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
         
         <div className="relative group cursor-pointer">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-700 border border-white shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300 group-hover:-translate-y-0.5 active:scale-95 overflow-hidden">
               <User size={22} className="drop-shadow-sm" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
         </div>
      </div>
    </header>
  );
};

export default Header;
