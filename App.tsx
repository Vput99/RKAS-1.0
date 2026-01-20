import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, ShoppingCart, Settings, Menu, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import ChatAssistant from './components/ChatAssistant';
import { getBudgets, addBudget, deleteBudget } from './lib/db';
import { Budget, TransactionType } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const result = await getBudgets();
    setData(result);
    setLoading(false);
  };

  const handleAdd = async (item: Omit<Budget, 'id' | 'created_at'>) => {
    const newItem = await addBudget(item);
    if (newItem) {
      setData(prev => [newItem, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteBudget(id);
    if (success) {
      setData(prev => prev.filter(item => item.id !== id));
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
          <NavItem id="expense" label="Belanja" icon={ShoppingCart} />
          
          <div className="pt-8 mt-8 border-t border-gray-100">
             <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-600 transition">
                <Settings size={20} />
                <span className={`${!isSidebarOpen && 'lg:hidden xl:block'}`}>Pengaturan</span>
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
               <p className="text-sm font-bold text-gray-800">SD Negeri 1 Contoh</p>
               <p className="text-xs text-gray-500">Tahun Anggaran 2024</p>
             </div>
             <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
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
                {activeTab === 'expense' && (
                  <TransactionTable 
                    type={TransactionType.EXPENSE} 
                    data={data} 
                    onAdd={handleAdd} 
                    onDelete={handleDelete}
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

// User Icon component was missing in import, adding a local SVG placeholder if needed or importing from lucide
// Added to import list above: User

export default App;