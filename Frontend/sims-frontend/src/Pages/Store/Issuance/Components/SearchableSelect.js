import React, { useState, useEffect } from 'react';

const SearchableSelect = ({ 
  label, name, value, onChange, options, required = false,
  placeholder = "Type to search...", displayFormat = (option) => option.name,
  filterBy = ['name']
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }
    const filtered = options.filter(option => 
      filterBy.some(prop => {
        const val = option[prop];
        if (!val) return false;
        return val.toString().toLowerCase().startsWith(searchTerm.toLowerCase());
      })
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options, filterBy]);

  const handleSelect = (option) => {
    // Emit the whole object instead of fake event
    onChange(option);
    setSearchTerm(displayFormat(option)); 
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const selectedOption = options.find(opt => opt.id == value);
  const displayValue = selectedOption ? displayFormat(selectedOption) : '';

  return (
    <div className="relative">
      {label && <label className="block text-white mb-1">{label}</label>}
      <input
        type="text"
        value={searchTerm}          
        onChange={handleInputChange}
        onFocus={() => { setIsOpen(true); setSearchTerm(displayValue); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full border rounded px-3 py-2"
        placeholder={placeholder}
        required={required}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map(option => (
            <div
              key={option.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(option)}
            >
              {displayFormat(option)}
            </div>
          ))}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && searchTerm && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
          <div className="px-3 py-2 text-gray-500">No matches found</div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
