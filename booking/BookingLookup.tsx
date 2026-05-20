import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface BookingLookupProps {
  onSearch: (query: string, type: 'reference' | 'email') => void;
  isLoading: boolean;
  error: string;
}

const BookingLookup: React.FC<BookingLookupProps> = ({ onSearch, isLoading, error }) => {
  const [searchType, setSearchType] = useState<'reference' | 'email'>('reference');
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim(), searchType);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-brand-navy text-center mb-6">Find Your Booking</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType('reference')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            searchType === 'reference' ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Reference #
        </button>
        <button
          onClick={() => setSearchType('email')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            searchType === 'email' ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Email
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative mb-4">
          <input
            type={searchType === 'email' ? 'email' : 'text'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchType === 'reference' ? 'e.g. UL-7K42' : 'e.g. john@example.com'}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full py-3 rounded-lg font-semibold bg-brand-orange hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Find Booking'}
        </button>
      </form>
    </div>
  );
};

export default BookingLookup;
