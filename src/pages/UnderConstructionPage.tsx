import React from 'react';
import { Construction } from 'lucide-react';

export function UnderConstructionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Construction className="h-16 w-16 text-indigo-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Em Construção</h1>
      <p className="text-gray-500">Esta página está em desenvolvimento.</p>
    </div>
  );
}