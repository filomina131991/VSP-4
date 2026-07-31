import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Show an inline search box (recommended for long lists). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Minimum width of the trigger in px. Default 180. */
  minWidth?: number;
  /** Horizontal alignment of the panel relative to the trigger. */
  align?: 'left' | 'right';
  /** Extra classes for the root wrapper (e.g. "w-full"). */
  className?: string;
  /** Smaller trigger height for dense toolbars. */
  size?: 'sm' | 'md';
  ariaLabel?: string;
  id?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  minWidth = 110,
  align = 'left',
  className = '',
  size = 'md',
  ariaLabel,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search on open; reset highlighted index to selected
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      const selIdx = filteredOptions.findIndex((o) => o.value === value);
      setHighlightedIdx(selIdx >= 0 ? selIdx : 0);
      if (searchable) {
        const t = setTimeout(() => searchRef.current?.focus(), 30);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const open = useCallback(() => {
    if (!disabled) setIsOpen(true);
  }, [disabled]);

  const selectOption = useCallback(
    (opt: DropdownOption) => {
      onChange(opt.value);
      setIsOpen(false);
      setSearchTerm('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (!isOpen) {
          e.preventDefault();
          open();
          return;
        }
        const opt = filteredOptions[highlightedIdx];
        if (opt) {
          e.preventDefault();
          selectOption(opt);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        setHighlightedIdx((i) => Math.min(i + 1, filteredOptions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        setHighlightedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
      } else if (e.key === 'Home') {
        if (isOpen) {
          e.preventDefault();
          setHighlightedIdx(0);
        }
      } else if (e.key === 'End') {
        if (isOpen) {
          e.preventDefault();
          setHighlightedIdx(filteredOptions.length - 1);
        }
      } else if (e.key.length === 1 && /\S/.test(e.key) && !searchable) {
        // Type-ahead when not searching
        const char = e.key.toLowerCase();
        const start = highlightedIdx + 1 >= filteredOptions.length ? 0 : highlightedIdx + 1;
        const order = [...filteredOptions.slice(start), ...filteredOptions.slice(0, start)];
        const match = order.find((o) => o.label.toLowerCase().startsWith(char));
        if (match) setHighlightedIdx(filteredOptions.indexOf(match));
      }
    },
    [disabled, isOpen, open, filteredOptions, highlightedIdx, searchable, selectOption]
  );

  // Keep highlighted item in view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlightedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx, isOpen]);

  const triggerHeight = size === 'sm' ? 'min-h-[28px] text-[11px]' : 'min-h-[34px] text-xs';

  return (
    <div
      className={`relative inline-block ${className}`}
      ref={wrapperRef}
      style={{ minWidth }}
    >
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`vz-trigger ${triggerHeight} ${isOpen ? 'is-open' : ''}`}
      >
        <span className={`flex-1 truncate ${selectedOption ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="vz-chevron text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={`vz-panel absolute z-50 ${align === 'right' ? 'right-0' : 'left-0'} min-w-full w-max max-w-[320px] shadow-xl`}
          role="listbox"
        >
          {searchable && (
            <div className="vz-search">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                placeholder={searchPlaceholder}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIdx(0);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div className="vz-list" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <div className="vz-empty">No options found</div>
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
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onClick={() => selectOption(opt)}
                    className={`vz-item ${isSelected ? 'vz-item-selected' : ''} ${
                      isHighlighted && !isSelected ? 'ring-1 ring-indigo-200 dark:ring-indigo-500/40' : ''
                    }`}
                  >
                    <span className="flex-1 whitespace-nowrap">
                      {opt.label}
                      {opt.subLabel && (
                        <span className="block text-[11px] font-normal text-gray-400 mt-0.5 whitespace-normal">
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

export default Dropdown;
