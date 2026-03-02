/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Send, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  User,
  Phone,
  Calendar,
  FileText,
  Info,
  LayoutDashboard,
  Eye,
  ArrowLeft,
  Search as SearchIcon
} from 'lucide-react';
import foodsData from './data/foods.json';
import measuresData from './data/measures.json';
import { 
  Food, 
  MeasureConversions, 
  DayRecord, 
  PatientData, 
  DailyTotals, 
  R2DSubmission, 
  Meal,
  FoodItem
} from './types';
import { calculateDailyTotals } from './utils/nutrition';
import { FoodSearch } from './components/FoodSearch';

const MEAL_NAMES = [
  'Café da manhã',
  'Lanche manhã',
  'Almoço',
  'Lanche tarde',
  'Jantar',
  'Ceia'
];

const MEASURES = [
  'colher de sopa',
  'colher de chá',
  'concha',
  'xícara',
  'copo',
  'fatia',
  'unidade',
  'prato raso',
  'prato fundo',
  'punhado',
  'g',
  'ml'
];

const foods = foodsData as Food[];
const measures = measuresData as MeasureConversions;

export default function App() {
  const [patient, setPatient] = useState<PatientData>({
    name: '',
    phone: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const createEmptyDay = (): DayRecord => ({
    meals: MEAL_NAMES.map(name => ({ name, items: [], skipped: false }))
  });

  const [day1, setDay1] = useState<DayRecord>(createEmptyDay());
  const [day2, setDay2] = useState<DayRecord>(createEmptyDay());
  
  const [summary, setSummary] = useState<{
    day1: DailyTotals;
    day2: DailyTotals;
    average: any;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'patient' | 'admin'>('patient');
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchEntries = async (keyToUse?: string) => {
    const key = keyToUse || adminKey;
    if (!key) return;

    setIsLoadingEntries(true);
    try {
      const response = await fetch('/api/entries', {
        headers: { 'X-ACCESS-KEY': key }
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        setError('Chave de acesso inválida.');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Erro ao conectar com o servidor.');
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleAdminAccess = () => {
    const key = prompt('Digite a Chave de Acesso do Médico:');
    if (key) {
      setAdminKey(key);
      fetchEntries(key);
      setView('admin');
    }
  };

  useEffect(() => {
    if (view === 'admin' && !isAuthenticated && adminKey) {
      fetchEntries();
    }
  }, [view]);

  const handleAddFood = (day: 1 | 2, mealIndex: number) => {
    const setter = day === 1 ? setDay1 : setDay2;
    setter(prev => {
      const newDay = { ...prev };
      newDay.meals[mealIndex].items.push({
        foodId: foods[0].id,
        measure: 'unidade',
        quantity: 1
      });
      newDay.meals[mealIndex].skipped = false;
      return newDay;
    });
  };

  const handleRemoveFood = (day: 1 | 2, mealIndex: number, itemIndex: number) => {
    const setter = day === 1 ? setDay1 : setDay2;
    setter(prev => {
      const newDay = { ...prev };
      newDay.meals[mealIndex].items.splice(itemIndex, 1);
      return newDay;
    });
  };

  const handleUpdateFood = (day: 1 | 2, mealIndex: number, itemIndex: number, field: keyof FoodItem, value: any) => {
    const setter = day === 1 ? setDay1 : setDay2;
    setter(prev => {
      const newDay = { ...prev };
      newDay.meals[mealIndex].items[itemIndex] = {
        ...newDay.meals[mealIndex].items[itemIndex],
        [field]: value
      };
      return newDay;
    });
  };

  const handleToggleSkip = (day: 1 | 2, mealIndex: number) => {
    const setter = day === 1 ? setDay1 : setDay2;
    setter(prev => {
      const newDay = { ...prev };
      newDay.meals[mealIndex].skipped = !newDay.meals[mealIndex].skipped;
      if (newDay.meals[mealIndex].skipped) {
        newDay.meals[mealIndex].items = [];
      }
      return newDay;
    });
  };

  const calculateResults = () => {
    const d1Totals = calculateDailyTotals(day1, foods, measures);
    const d2Totals = calculateDailyTotals(day2, foods, measures);

    const average = {
      kcal: (d1Totals.kcal + d2Totals.kcal) / 2,
      protein: (d1Totals.protein + d2Totals.protein) / 2,
      carb: (d1Totals.carb + d2Totals.carb) / 2,
      fat: (d1Totals.fat + d2Totals.fat) / 2,
      fiber: (d1Totals.fiber + d2Totals.fiber) / 2,
      sodium_mg: (d1Totals.sodium_mg + d2Totals.sodium_mg) / 2,
    };

    const newSummary = { day1: d1Totals, day2: d2Totals, average };
    setSummary(newSummary);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return newSummary;
  };

  const handleSubmit = async () => {
    if (!patient.name || !patient.phone) {
      setError('Por favor, preencha o nome e telefone.');
      return;
    }

    let currentSummary = summary;
    if (!currentSummary) {
      currentSummary = calculateResults();
    }

    setIsSubmitting(true);
    setError(null);

    const submission: R2DSubmission = {
      patient,
      days: [day1, day2],
      summary: currentSummary
    };

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ACCESS-KEY': adminKey || 'R2D-SECRET-2024'
        },
        body: JSON.stringify(submission)
      });

      if (response.ok) {
        const data = await response.json();
        setProtocol(data.protocol);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao enviar dados.');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(`Erro ao enviar: ${err.message}. Tente novamente.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'admin') {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B1F3A] mb-4">Acesso Restrito</h2>
            <p className="text-gray-500 mb-8">Você precisa de uma chave válida para acessar os dados dos pacientes.</p>
            <button 
              onClick={handleAdminAccess}
              className="w-full py-4 bg-[#0B1F3A] text-white font-bold rounded-xl hover:bg-blue-900 transition-all"
            >
              Digitar Chave de Acesso
            </button>
            <button 
              onClick={() => setView('patient')}
              className="w-full mt-4 py-2 text-gray-400 font-semibold hover:text-gray-600"
            >
              Voltar para o Início
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#0B1F3A] font-sans pb-20">
        <header className="bg-[#0B1F3A] text-white py-8 px-6 shadow-xl">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => { setView('patient'); setSelectedEntry(null); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold">Painel do Médico</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => fetchEntries()}
                disabled={isLoadingEntries}
                className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                title="Atualizar lista"
              >
                <motion.div animate={isLoadingEntries ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Plus className={`w-6 h-6 ${isLoadingEntries ? 'animate-spin' : ''}`} style={{ transform: 'rotate(45deg)' }} />
                </motion.div>
              </button>
              <div className="bg-blue-900/50 px-4 py-2 rounded-xl border border-blue-700 text-sm font-mono">
                {entries.length} Registros
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 mt-8">
          {selectedEntry ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{selectedEntry.patient_name}</h2>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {selectedEntry.patient_phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-400 uppercase">Protocolo</p>
                    <p className="font-mono font-bold text-[#0B1F3A]">{selectedEntry.protocol}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data de Início</p>
                    <p className="font-semibold">{selectedEntry.start_date}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Enviado em</p>
                    <p className="font-semibold">{new Date(selectedEntry.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Observações</p>
                    <p className="font-semibold">{selectedEntry.notes || "Nenhuma"}</p>
                  </div>
                </div>

                {/* Totals Summary */}
                {(() => {
                  const totals = JSON.parse(selectedEntry.totals_json);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                      {[
                        { label: 'Kcal', value: totals.average.kcal.toFixed(0), unit: 'kcal', color: 'bg-blue-50 text-blue-700' },
                        { label: 'Proteína', value: totals.average.protein.toFixed(1), unit: 'g', color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Carbo', value: totals.average.carb.toFixed(1), unit: 'g', color: 'bg-amber-50 text-amber-700' },
                        { label: 'Gordura', value: totals.average.fat.toFixed(1), unit: 'g', color: 'bg-rose-50 text-rose-700' },
                        { label: 'Fibras', value: totals.average.fiber.toFixed(1), unit: 'g', color: 'bg-teal-50 text-teal-700' },
                        { label: 'Sódio', value: totals.average.sodium_mg.toFixed(0), unit: 'mg', color: 'bg-slate-50 text-slate-700' },
                      ].map((stat, i) => (
                        <div key={i} className={`${stat.color} p-4 rounded-2xl text-center border border-transparent`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{stat.label}</p>
                          <p className="text-lg font-black">{stat.value}</p>
                          <p className="text-[10px] font-bold">{stat.unit}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <button 
                  onClick={() => setSelectedEntry(null)}
                  className="w-full py-4 bg-gray-100 text-[#0B1F3A] font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Voltar para a Lista
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Protocolo</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoadingEntries ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Carregando registros...</td></tr>
                    ) : entries.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-[#0B1F3A]">{entry.patient_name}</p>
                            <p className="text-xs text-gray-400">{entry.patient_phone}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">
                            {entry.protocol}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setSelectedEntry(entry)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (protocol) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#0B1F3A] mb-2">Enviado com Sucesso!</h1>
          <p className="text-gray-600 mb-8">Seu recordatório alimentar foi processado e enviado ao seu nutricionista.</p>
          
          <div className="bg-[#0B1F3A] rounded-2xl p-6 mb-8">
            <p className="text-blue-200 text-sm uppercase tracking-widest mb-1">Código de Protocolo</p>
            <p className="text-white text-2xl font-mono font-bold tracking-wider">{protocol}</p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gray-100 text-[#0B1F3A] font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Novo Preenchimento
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0B1F3A] font-sans pb-20">
      {/* Header */}
      <header className="bg-[#0B1F3A] text-white pt-12 pb-20 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Recordatório Alimentar</h1>
          <div className="flex items-center space-x-2 text-blue-200 opacity-80">
            <span className="px-3 py-1 bg-blue-900/50 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-700">Protocolo R2D</span>
            <span className="text-sm">• 2 Dias de Acompanhamento</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-12">
        {/* Patient Info Card */}
        <section className="bg-white rounded-3xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex items-center mb-6 space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-[#0B1F3A]" />
            </div>
            <h2 className="text-xl font-bold">Identificação do Paciente</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nome Completo</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={patient.name}
                  onChange={e => setPatient({...patient, name: e.target.value})}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] focus:border-transparent outline-none transition-all"
                  placeholder="Ex: João da Silva"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">WhatsApp / Telefone</label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={patient.phone}
                  onChange={e => setPatient({...patient, phone: e.target.value})}
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] focus:border-transparent outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Data de Início</label>
              <input 
                type="date" 
                value={patient.startDate}
                onChange={e => setPatient({...patient, startDate: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Observações</label>
              <input 
                type="text" 
                value={patient.notes}
                onChange={e => setPatient({...patient, notes: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] focus:border-transparent outline-none transition-all"
                placeholder="Ex: Dia atípico, festa, etc."
              />
            </div>
          </div>
        </section>

        {/* Days Records */}
        {[1, 2].map((dayNum) => (
          <section key={dayNum} className="mb-12">
            <div className="flex items-center mb-6 space-x-4">
              <div className="w-12 h-12 bg-[#0B1F3A] text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                {dayNum}
              </div>
              <h2 className="text-2xl font-bold">Dia {dayNum}</h2>
            </div>

            <div className="space-y-6">
              {(dayNum === 1 ? day1 : day2).meals.map((meal, mealIdx) => (
                <div key={mealIdx} className={`bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all ${meal.skipped ? 'opacity-60 grayscale' : ''}`}>
                  <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-50">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-[#0B1F3A]">{meal.name}</h3>
                      {meal.items.length > 0 && !meal.skipped && (
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
                          {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleToggleSkip(dayNum as 1 | 2, mealIdx)}
                        className={`text-xs font-bold px-4 py-2 rounded-full transition-all border ${
                          meal.skipped 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {meal.skipped ? 'REFEIÇÃO PULADA' : 'NÃO COMI NESTA REFEIÇÃO'}
                      </button>
                      
                      {!meal.skipped && (
                        <button 
                          onClick={() => handleAddFood(dayNum as 1 | 2, mealIdx)}
                          className="p-2 bg-[#0B1F3A] text-white rounded-xl hover:bg-blue-900 transition-colors shadow-md"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {meal.items.length === 0 && !meal.skipped && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-gray-400 text-sm">Nenhum alimento adicionado.</p>
                        <button 
                          onClick={() => handleAddFood(dayNum as 1 | 2, mealIdx)}
                          className="mt-3 text-[#0B1F3A] font-bold text-sm hover:underline"
                        >
                          + Adicionar Primeiro Item
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {meal.items.map((item, itemIdx) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={itemIdx} 
                          className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-start md:items-center"
                        >
                          <div className="flex-1 w-full">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Alimento</label>
                            <FoodSearch 
                              foods={foods}
                              selectedFoodId={item.foodId}
                              onSelect={(foodId) => handleUpdateFood(dayNum as 1 | 2, mealIdx, itemIdx, 'foodId', foodId)}
                            />
                          </div>

                          <div className="w-full md:w-40">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Medida</label>
                            <select 
                              value={item.measure}
                              onChange={e => handleUpdateFood(dayNum as 1 | 2, mealIdx, itemIdx, 'measure', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B1F3A] outline-none"
                            >
                              {MEASURES.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full md:w-24">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Qtd</label>
                            <input 
                              type="number" 
                              min="0.1"
                              step="0.1"
                              value={isNaN(item.quantity) ? '' : item.quantity}
                              onChange={e => {
                                const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                                handleUpdateFood(dayNum as 1 | 2, mealIdx, itemIdx, 'quantity', val);
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B1F3A] outline-none"
                            />
                          </div>

                          <button 
                            onClick={() => handleRemoveFood(dayNum as 1 | 2, mealIdx, itemIdx)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors self-end md:self-center"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <button 
            onClick={calculateResults}
            className="flex-1 py-5 bg-white border-2 border-[#0B1F3A] text-[#0B1F3A] font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center space-x-3 shadow-sm"
          >
            <Calculator className="w-6 h-6" />
            <span>CALCULAR RESUMO</span>
          </button>
          
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-5 bg-[#0B1F3A] text-white font-bold rounded-2xl hover:bg-blue-900 transition-all flex items-center justify-center space-x-3 shadow-xl disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>ENVIAR PARA O MÉDICO</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl mb-8 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Summary Display */}
        <AnimatePresence>
          {summary && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden mb-12"
            >
              <div className="bg-[#0B1F3A] p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Resumo Nutricional</h2>
                <p className="text-blue-200 text-sm opacity-80">Estimativa baseada nos dados informados.</p>
              </div>

              <div className="p-8">
                {/* Average Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
                  {[
                    { label: 'Kcal', value: summary.average.kcal.toFixed(0), unit: 'kcal', color: 'bg-blue-50 text-blue-700' },
                    { label: 'Proteína', value: summary.average.protein.toFixed(1), unit: 'g', color: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Carbo', value: summary.average.carb.toFixed(1), unit: 'g', color: 'bg-amber-50 text-amber-700' },
                    { label: 'Gordura', value: summary.average.fat.toFixed(1), unit: 'g', color: 'bg-rose-50 text-rose-700' },
                    { label: 'Fibras', value: summary.average.fiber.toFixed(1), unit: 'g', color: 'bg-teal-50 text-teal-700' },
                    { label: 'Sódio', value: summary.average.sodium_mg.toFixed(0), unit: 'mg', color: 'bg-slate-50 text-slate-700' },
                  ].map((stat, i) => (
                    <div key={i} className={`${stat.color} p-4 rounded-2xl text-center border border-transparent hover:border-current/10 transition-all`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{stat.label}</p>
                      <p className="text-xl font-black">{stat.value}</p>
                      <p className="text-[10px] font-bold">{stat.unit}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Day 1 Details */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                      <div className="w-2 h-2 bg-[#0B1F3A] rounded-full"></div>
                      <h3 className="font-bold uppercase tracking-widest text-xs text-gray-500">Destaques Dia 1</h3>
                    </div>
                    <ul className="space-y-3">
                      {summary.day1.topItems.map((item, i) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-xl">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <span className="font-bold text-[#0B1F3A]">{item.kcal.toFixed(0)} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Day 2 Details */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                      <div className="w-2 h-2 bg-[#0B1F3A] rounded-full"></div>
                      <h3 className="font-bold uppercase tracking-widest text-xs text-gray-500">Destaques Dia 2</h3>
                    </div>
                    <ul className="space-y-3">
                      {summary.day2.topItems.map((item, i) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-xl">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <span className="font-bold text-[#0B1F3A]">{item.kcal.toFixed(0)} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Warnings */}
                {(summary.day1.warnings.length > 0 || summary.day2.warnings.length > 0) && (
                  <div className="mt-12 p-6 bg-amber-50 rounded-3xl border border-amber-100">
                    <div className="flex items-center space-x-2 mb-4 text-amber-800">
                      <Info className="w-5 h-5" />
                      <h4 className="font-bold">Avisos de Conversão</h4>
                    </div>
                    <ul className="space-y-2">
                      {[...new Set([...summary.day1.warnings, ...summary.day2.warnings])].map((w, i) => (
                        <li key={i} className="text-xs text-amber-700 flex items-start space-x-2">
                          <span>•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 text-center text-gray-400 text-xs space-y-4">
        <div className="h-px bg-gray-200 w-full mb-6"></div>
        <div className="flex justify-center space-x-4 mb-4">
          <button 
            onClick={handleAdminAccess}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all font-bold"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>PAINEL DO MÉDICO</span>
          </button>
        </div>
        <p>Não inclua informações sensíveis. Uso exclusivo para avaliação nutricional.</p>
        <p>© 2024 Nutrologia Médica • Sistema de Recordatório R2D</p>
      </footer>
    </div>
  );
}
