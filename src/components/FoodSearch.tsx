import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Food } from '../types';

interface FoodSearchProps {
  foods: Food[];
  selectedFoodId: string;
  onSelect: (foodId: string) => void;
}

export function FoodSearch({ foods, selectedFoodId, onSelect }: FoodSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedFood = foods.find(f => f.id === selectedFoodId);

  useEffect(() => {
    if (selectedFood && !isOpen) {
      setSearchTerm(selectedFood.name);
    }
  }, [selectedFood, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFoods = foods.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Pesquisar alimento..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#0B1F3A] outline-none transition-all"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <ChevronDown className={`absolute right-3 top-2.5 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredFoods.length > 0 ? (
            filteredFoods.map(food => (
              <button
                key={food.id}
                onClick={() => {
                  onSelect(food.id);
                  setSearchTerm(food.name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 transition-colors flex flex-col"
              >
                <span className="font-medium text-[#0B1F3A]">{food.name}</span>
                <span className="text-[10px] text-gray-400 uppercase">{food.kcal} kcal / 100g</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 italic">Nenhum alimento encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
