'use client';

import { useState, useCallback } from 'react';

interface AutocompleteOptions {
  storageKey: string;
  maxSuggestions?: number;
  minChars?: number;
}

interface AutocompleteData {
  suggestions: string[];
  addValue: (value: string) => void;
  getSuggestions: (query: string) => string[];
  clearHistory: () => void;
}

/**
 * Custom hook for autocomplete functionality with localStorage persistence
 * Similar to VS Code IntelliSense - remembers previously entered values
 */
export function useAutocomplete({
  storageKey,
  maxSuggestions = 50,
  minChars = 1
}: AutocompleteOptions): AutocompleteData {
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    // Initialize from localStorage on mount
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading autocomplete data:', error);
    }
    return [];
  });

  // Save new value to suggestions
  const addValue = useCallback((value: string) => {
    if (!value || value.trim().length < minChars) return;
    
    const trimmedValue = value.trim();
    
    setSuggestions((prev) => {
      // Remove duplicates and add new value at the start
      const filtered = prev.filter((item) => 
        item.toLowerCase() !== trimmedValue.toLowerCase()
      );
      const updated = [trimmedValue, ...filtered].slice(0, maxSuggestions);
      
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving autocomplete data:', error);
      }
      
      return updated;
    });
  }, [storageKey, maxSuggestions, minChars]);

  // Get filtered suggestions based on query
  const getSuggestions = useCallback((query: string): string[] => {
    if (!query || query.length < minChars) return [];
    
    const lowerQuery = query.toLowerCase();
    
    // Fuzzy search: match if query appears anywhere in the suggestion
    return suggestions
      .filter((suggestion) => 
        suggestion.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10); // Limit to 10 visible suggestions
  }, [suggestions, minChars]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setSuggestions([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing autocomplete data:', error);
    }
  }, [storageKey]);

  return {
    suggestions,
    addValue,
    getSuggestions,
    clearHistory
  };
}
