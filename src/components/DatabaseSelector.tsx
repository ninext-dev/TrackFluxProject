import React from 'react';
import { Database } from 'lucide-react';

interface DatabaseSelectorProps {
  selectedEnv: string;
  onChange: (env: string) => void;
}

export function DatabaseSelector({ selectedEnv, onChange }: DatabaseSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <Database className="h-6 w-6 text-indigo-600 mr-2" />
        <span className="text-sm font-medium text-gray-700">Selecione o Ambiente</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('reforpan')}
          className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium ${
            selectedEnv === 'reforpan'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Reforpan
        </button>
        <button
          type="button"
          onClick={() => onChange('test')}
          className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium ${
            selectedEnv === 'test'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Teste
        </button>
      </div>
    </div>
  );
}