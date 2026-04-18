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
    <div className="flex-1 overflow-hidden relative rounded-[40px] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_12px_48px_rgba(1,83,84,0.05)]">
      <div className="absolute inset-0 overflow-y-auto p-4 md:p-6 scrollbar-hide">
        <div className="max-w-7xl mx-auto h-full relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-teal-600/40">
              <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="font-black tracking-[0.2em] uppercase text-[10px]">Syncing Data...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-full gap-4 text-teal-600/40 animate-in fade-in zoom-in duration-500">
                  <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
                  <p className="font-black tracking-[0.2em] uppercase text-[10px]">Preparing Module...</p>
                </div>
              }>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
