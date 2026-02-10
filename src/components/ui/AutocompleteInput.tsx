'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, History } from 'lucide-react';
import { useAutocomplete } from '@/hooks/useAutocomplete';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  storageKey: string;
  placeholder?: string;
  className?: string;
  label?: string;
  type?: 'text' | 'textarea';
  rows?: number;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Smart autocomplete input component similar to VS Code IntelliSense
 * Shows previously entered values as suggestions while typing
 */
export default function AutocompleteInput({
  value,
  onChange,
  onBlur,
  storageKey,
  placeholder,
  className = '',
  label,
  type = 'text',
  rows = 3,
  disabled = false,
  required = false
}: AutocompleteInputProps) {
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { addValue, getSuggestions } = useAutocomplete({
    storageKey,
    maxSuggestions: 50,
    minChars: 1
  });

  const filteredSuggestions = getSuggestions(value);
  const showSuggestions = inputFocused && filteredSuggestions.length > 0 && value.length > 0;

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (type !== 'textarea') {
          e.preventDefault();
        }
        if (filteredSuggestions[selectedIndex]) {
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setInputFocused(false);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setInputFocused(false);
    inputRef.current?.focus();
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Handle blur with delay to allow clicking suggestions
  const handleBlur = () => {
    setTimeout(() => {
      setInputFocused(false);
      
      // Save the value if it's not empty
      if (value && value.trim()) {
        addValue(value);
      }
      
      onBlur?.();
    }, 200);
  };

  const handleFocus = () => {
    setInputFocused(true);
  };

  // Base input classes
  const baseInputClasses = `w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white 
    focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
    transition-all duration-200 ${className}`;

  return (
    <div className="relative w-full">
      {label && (
        <label className="text-sm text-zinc-400 mb-1 block">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={baseInputClasses}
            rows={rows}
            disabled={disabled}
            required={required}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={baseInputClasses}
            disabled={disabled}
            required={required}
          />
        )}

        {/* History indicator when input is focused and has history */}
        {inputFocused && !value && filteredSuggestions.length === 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <History className="w-4 h-4 text-zinc-500" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-zinc-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={`${suggestion}-${index}`}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all
                    ${index === selectedIndex 
                      ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-500' 
                      : 'text-zinc-300 hover:bg-white/5 border-l-2 border-transparent'
                    }`}
                >
                  <Check className={`w-4 h-4 flex-shrink-0 ${
                    index === selectedIndex ? 'opacity-100' : 'opacity-0'
                  }`} />
                  <span className="flex-1 truncate text-sm">{suggestion}</span>
                  {index === selectedIndex && (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      Enter
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* Footer hint */}
            <div className="px-4 py-2 bg-zinc-950/80 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 flex items-center gap-2">
                <History className="w-3 h-3" />
                Previously entered values
              </span>
              <span className="text-[10px] text-zinc-500">
                ↑↓ Navigate | Enter Select | Esc Close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
