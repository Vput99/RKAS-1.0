import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, FileCheck, Settings as SettingsIcon, Menu, User, BookOpen, FileBarChart, Wifi } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import BudgetPlanning from './components/BudgetPlanning';
import SPJRealization from './components/SPJRealization';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ChatAssistant from './components/ChatAssistant';
import { getBudgets, addBudget, updateBudget, deleteBudget, getSchoolProfile, checkDatabaseConnection } from './lib/db';
import { supabase } from './lib/supabase'; // Import supabase client
import { Budget, TransactionType, SchoolProfile } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'planning' | 'spj' | 'reports' | 'settings'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<Budget[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // Load Initial Data
  useEffect(() => {
    fetchData();
    checkConnection();
  }, []);

  // --- REALTIME LISTENER SETUP ---
  useEffect(() => {
    if (!supabase) return;

    // Create a subscription to the 'budgets' and 'school_profiles' tables
    const channel = supabase
      .channel('public:db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        (payload) => {
          console.log('Realtime update received (Budgets):', payload);
          // Refresh full data to ensure consistency
          getBudgets().then(setData);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_profiles' },
        (payload) => {
          console.log('Realtime update received (Profile):', payload);
          getSchoolProfile().then(setSchoolProfile);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    // 1. Call DB
    const newItem = await addBudget(item);
    
    // 2. Optimistic Update (Immediate Feedback)
    if (newItem) {
      setData(prev => {
        // Prevent duplicates if Realtime fires quickly
        if (prev.some(p => p.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Budget>) => {
    // Optimistic Update immediately
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    
    const updatedItem = await updateBudget(id, updates);
    if (!updatedItem) {
        // Revert if failed (fetch data again)
        fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic Delete
    const originalData = [...data];
    setData(prev => prev.filter(item => item.id !== id));

    const success = await deleteBudget(id);
    if (!success) {
        // Revert if failed
        setData(originalData);
    }
  };

  // Mobile responsiveness for sidebar
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
      <aside className={`fixed lg:relative z-30 w-64 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 xl:w-64'
      }`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between lg:justify-center xl:justify-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
            R
          </div>
          <span className={`text-xl font-bold text-gray-800 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
            RKAS Pintar
          </span>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem id="income" label="Pendapatan" icon={Wallet} />
          <NavItem id="planning" label="Penganggaran" icon={BookOpen} />
          <NavItem id="spj" label="Peng-SPJ-an" icon={FileCheck} />
          <NavItem id="reports" label="Laporan" icon={FileBarChart} />
          
          <div className="pt-8 mt-8 border-t border-gray-100">
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
          </div>
        </nav>
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
                  <span>Tahun {schoolProfile?.fiscalYear || '2026'}</span>
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
                {activeTab === 'dashboard' && <Dashboard data={data} />}
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
    </div>
  );
}

export default App;