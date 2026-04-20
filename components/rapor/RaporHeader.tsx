import React from 'react';
import { TrendingUp, CalendarRange } from 'lucide-react';

interface RaporHeaderProps {
  targetYear: string;
  setTargetYear: (year: string) => void;
}

const RaporHeader: React.FC<RaporHeaderProps> = ({ targetYear, setTargetYear }) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
      <div>
         <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
           <TrendingUp className="text-blue-600" /> Rapor Pendidikan & PBD
         </h2>
         <p className="text-sm text-gray-500">Analisis capaian sekolah untuk Perencanaan Berbasis Data.</p>
      </div>
      <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center">
              <div className="bg-blue-50 px-3 py-2 rounded-l-md border-r border-gray-100 text-blue-700 font-bold text-xs flex items-center gap-2">
                  <CalendarRange size={16} />
                  Target RKAS
              </div>
              <select 
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none bg-transparent"
              >
                  <option value="2027">Tahun 2027 (Rapor 2026)</option>
                  <option value="2026">Tahun 2026 (Rapor 2025)</option>
              </select>
          </div>
      </div>
    </div>
  );
};

export default RaporHeader;
