import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'];

function toDisplay(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePicker({ value, onChange, placeholder = 'Selecionar data', className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthYearOpen, setIsMonthYearOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return new Date(`${value}T12:00:00`);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value) return;
    const next = new Date(`${value}T12:00:00`);
    if (!isNaN(next.getTime())) {
      setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthYearOpen(false);
      }
    }

    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setAlignRight(rect.left + 288 > window.innerWidth - 16);
      document.addEventListener('mousedown', handleOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(currentMonth)
      .replace(/^\w/, (char) => char.toUpperCase());
  }, [currentMonth]);

  const yearValue = currentMonth.getFullYear();
  const yearLabel = String(yearValue);
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat('pt-BR', { month: 'long' })
          .format(new Date(2020, index, 1))
          .replace(/^\w/, (char) => char.toUpperCase()),
      ),
    [],
  );

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const result: Array<{ date: Date; isCurrent: boolean } | null> = [];

    for (let i = 0; i < startOffset; i += 1) {
      result.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      result.push({ date: new Date(year, month, day), isCurrent: true });
    }

    return result;
  }, [currentMonth]);

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-[var(--color-bg)] border border-gray-800 p-2.5 pl-3 pr-9 rounded-xl text-left text-gray-200 text-[10px] focus:border-[var(--color-accent)]/50 outline-none transition-all"
      >
        {value ? (
          <span>{toDisplay(value)}</span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" size={18} />
      </button>

      {isOpen && (
        <div className={`absolute top-full z-[80] mt-2 w-72 max-w-[calc(100vw-2rem)] ${alignRight ? 'right-0 left-auto' : 'left-0 right-auto'}`}>
          <div className="rounded-2xl border border-transparent bg-[var(--color-bg)] p-4 shadow-2xl modal-gold-border gold-border-relative">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((prev) =>
                  isMonthYearOpen
                    ? new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                    : new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
              aria-label={isMonthYearOpen ? 'Ano anterior' : 'Mes anterior'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsMonthYearOpen((prev) => !prev)}
              className="text-[11px] font-bold text-gray-200 uppercase tracking-widest hover:text-[var(--color-accent)]"
              aria-label="Selecionar mes e ano"
            >
              {isMonthYearOpen ? yearLabel : monthLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth((prev) =>
                  isMonthYearOpen
                    ? new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                    : new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
              aria-label={isMonthYearOpen ? 'Ano seguinte' : 'Mes seguinte'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {isMonthYearOpen ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {months.map((monthName, index) => {
                const isActive = currentMonth.getMonth() === index;
                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => {
                      setCurrentMonth((prev) => new Date(prev.getFullYear(), index, 1));
                      setIsMonthYearOpen(false);
                    }}
                    className={`h-9 rounded-lg text-[10px] uppercase tracking-widest transition-all ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold'
                        : 'text-gray-300 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'
                    }`}
                  >
                    {monthName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-gray-500 mb-2">
                {weekDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {days.map((cell, index) => {
                  if (!cell) {
                    return <span key={`empty-${index}`} className="h-8" />;
                  }

                  const iso = toISO(cell.date);
                  const isSelected = value === iso;

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setIsOpen(false);
                      }}
                      className={`h-8 rounded-lg text-[10px] transition-all ${
                        isSelected
                        ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold'
                        : 'text-gray-300 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'
                      }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}


