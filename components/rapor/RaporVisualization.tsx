import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RaporIndicator } from '../../types';

interface RaporVisualizationProps {
  indicators: RaporIndicator[];
  getColor: (category: string) => string;
}

const RaporVisualization: React.FC<RaporVisualizationProps> = ({ indicators, getColor }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <h3 className="font-bold text-gray-700 mb-6">Visualisasi Mutu Sekolah</h3>
        <div className="w-full h-64">
           <ResponsiveContainer width="100%" height="100%">
               <BarChart data={indicators}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="id" tick={{fontSize: 12}} />
                   <YAxis domain={[0, 100]} />
                   <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{fill: '#f3f4f6'}} />
                   <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                       {indicators.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={getColor(entry.category)} />
                       ))}
                   </Bar>
               </BarChart>
           </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-4 text-xs font-medium text-gray-500">
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Kurang (&lt;50)</div>
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Sedang (50-70)</div>
           <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Baik (&gt;70)</div>
        </div>
    </div>
  );
};

export default RaporVisualization;
