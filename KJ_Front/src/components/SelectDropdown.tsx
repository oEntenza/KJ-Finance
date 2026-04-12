import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = {
  value: string;
  label: string;
};

type SelectDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
};

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Selecionar',
  className = '',
  wrapperClassName = '',
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? '';

  return (
    <div ref={wrapperRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-[var(--color-bg)] border border-gray-800 p-2.5 pr-9 rounded-xl text-left text-gray-200 text-xs focus:border-[var(--color-accent)]/50 outline-none transition-all ${className}`}
      >
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" size={16} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full">
          <div className="rounded-xl border border-transparent bg-[var(--color-bg)] shadow-2xl modal-gold-border gold-border-relative">
            <div className="custom-scroll max-h-72 overflow-y-auto rounded-xl p-2">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold'
                        : 'text-gray-300 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
