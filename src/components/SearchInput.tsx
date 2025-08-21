import React, { useState, KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (filters: string[]) => void;
  className?: string;
}

export function SearchInput({ placeholder = "Pesquisar...", onSearch, className = "" }: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<string[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const newFilter = searchTerm.trim();
      if (!filters.includes(newFilter)) {
        const newFilters = [...filters, newFilter];
        setFilters(newFilters);
        onSearch(newFilters);
      }
      setSearchTerm('');
    }
  };

  const removeFilter = (filter: string) => {
    const newFilters = filters.filter(f => f !== filter);
    setFilters(newFilters);
    onSearch(newFilters);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${className}`}
          placeholder={placeholder}
        />
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.map((filter, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-indigo-100 text-indigo-800"
            >
              {filter}
              <button
                type="button"
                onClick={() => removeFilter(filter)}
                className="ml-1.5 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-600"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}