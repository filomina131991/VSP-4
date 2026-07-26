import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  subLabel?: string; // e.g. for School code or location
  searchTerms?: string; // extra terms like place, code
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  minWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Search and select...",
  disabled = false,
  searchPlaceholder = "Search by name, code or place...",
  minWidth = 200,
  className = '',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      const selIdx = filteredOptions.findIndex((o) => o.value === value);
      setHighlightedIdx(selIdx >= 0 ? selIdx : 0);
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const labelLower = opt.label.toLowerCase();
    const subLower = opt.subLabel?.toLowerCase() || '';
    const termsLower = opt.searchTerms?.toLowerCase() || '';
    return (
      labelLower.includes(searchLower) ||
      subLower.includes(searchLower) ||
      termsLower.includes(searchLower)
    );
  });

  const selectOption = (opt: Option) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter') {
      const opt = filteredOptions[highlightedIdx];
      if (opt) {
        e.preventDefault();
        selectOption(opt);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIdx((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlightedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx, isOpen]);

  return (
    <div
      className={`relative inline-block ${className}`}
      ref={wrapperRef}
      style={{ minWidth }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : !disabled && setIsOpen(true))}
        onKeyDown={handleKeyDown}
        className={`vz-trigger min-h-[38px] ${isOpen ? 'is-open' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={`flex-1 truncate text-left ${selectedOption ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className="vz-chevron text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="vz-panel absolute z-50 left-0 w-full" role="listbox">
          <div className="vz-search">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              autoFocus
              className="flex-1 bg-transparent border-none text-xs font-bold outline-none text-gray-900 dark:text-white"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIdx(0);
              }}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <X
                size={14}
                className="text-gray-400 cursor-pointer hover:text-red-500 shrink-0"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          <div className="vz-list" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="vz-empty">No matching schools found</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIdx;
                return (
                  <div
                    key={opt.value}
                    data-idx={idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className={`vz-item ${isSelected ? 'vz-item-selected' : ''} ${
                      isHighlighted && !isSelected ? 'ring-1 ring-indigo-200 dark:ring-indigo-500/40' : ''
                    }`}
                  >
                    <span className="flex-1 truncate">
                      {opt.label}
                      {opt.subLabel && (
                        <span className="block text-[11px] font-normal font-mono text-gray-400 mt-0.5 truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={16} className="text-indigo-500 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
