import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget, SchoolProfile, TransactionType } from '../../types';
import { AppTab } from './Sidebar';

// Lazy Load heavy components
const Dashboard = lazy(() => import('../Dashboard'));
const TransactionTable = lazy(() => import('../TransactionTable'));
const BudgetPlanning = lazy(() => import('../BudgetPlanning'));
const SPJRealization = lazy(() => import('../SPJRealization'));
const Reports = lazy(() => import('../Reports'));
const Settings = lazy(() => import('../Settings'));
const RaporPendidikan = lazy(() => import('../RaporPendidikan'));
const BankWithdrawal = lazy(() => import('../BankWithdrawal'));
const EvidenceTemplates = lazy(() => import('../EvidenceTemplates'));
const InventoryReports = lazy(() => import('../InventoryReports'));
const BKU = lazy(() => import('../BKU'));
const LetterMaker = lazy(() => import('../LetterMaker'));

interface AppContentProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  data: Budget[];
  schoolProfile: SchoolProfile | null;
  loading: boolean;
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Budget>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onProfileUpdate: (updated: SchoolProfile) => void;
}

const AppContent = ({
  activeTab,
  setActiveTab,
  data,
  schoolProfile,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onProfileUpdate
}: AppContentProps) => {
  return (
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
                  {activeTab === 'rapor' && <RaporPendidikan onAddBudget={onAdd} budgetData={data} profile={schoolProfile} />}
                  {activeTab === 'income' && <TransactionTable type={TransactionType.INCOME} data={data} onAdd={onAdd} onDelete={onDelete} />}
                  {activeTab === 'planning' && <BudgetPlanning data={data} profile={schoolProfile} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />}
                  {activeTab === 'withdrawal' && <BankWithdrawal data={data} profile={schoolProfile} onUpdate={onUpdate} />}
                  {activeTab === 'spj' && <SPJRealization data={data} profile={schoolProfile} onUpdate={onUpdate} />}
                  {activeTab === 'evidence' && <EvidenceTemplates budgets={data} onUpdate={onUpdate} />}
                  {activeTab === 'reports' && <Reports data={data} />}
                  {activeTab === 'inventory' && <InventoryReports budgets={data} schoolProfile={schoolProfile!} />}
                  {activeTab === 'bku' && <BKU data={data} profile={schoolProfile} onBack={() => setActiveTab('dashboard')} />}
                  {activeTab === 'letters' && <LetterMaker schoolProfile={schoolProfile} />}
                  {activeTab === 'settings' && <Settings onProfileUpdate={onProfileUpdate} />}
                </motion.div>
              </Suspense>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppContent;
