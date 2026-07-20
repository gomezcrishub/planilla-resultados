import React, { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Check,
  Eye,
  Pencil,
  Lock,
  Unlock,
  Database,
  Cloud,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Row {
  text: string;
  group: string;
  m1vs2?: string;
  m1vs3?: string;
  m2vs3?: string;
  g1vsP2?: string;
  wins?: string;
  setsDiff?: string;
  gamesDiff?: string;
}

interface PlayoffMatch {
  p1: string;
  p2: string;
  s1: string;
  s2: string;
  s3?: string;
  s4?: string;
  s5?: string;
  s6?: string;
}

interface Category {
  id: string;
  name: string;
  rows: Row[];
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'PAREJA PRINCIPAL',
    rows: Array(15).fill(null).map(() => ({ text: '', group: '' }))
  }
];



const getMatchStatus = (score: string | undefined): 'win' | 'loss' | 'none' => {
  if (!score) return 'none';
  const cleanScore = score.trim();
  if (!cleanScore || cleanScore === '-') return 'none';
  
  const sets = cleanScore.split(/\s+/);
  let setsWon = 0;
  let setsLost = 0;
  
  for (const set of sets) {
    const parts = set.split('-');
    if (parts.length === 2) {
      const g1 = parseInt(parts[0], 10);
      const g2 = parseInt(parts[1], 10);
      if (!isNaN(g1) && !isNaN(g2)) {
        if (g1 > g2) {
          setsWon++;
        } else if (g2 > g1) {
          setsLost++;
        }
      }
    }
  }
  
  if (setsWon > setsLost) return 'win';
  if (setsLost > setsWon) return 'loss';
  return 'none';
};

const calculateCoupleStats = (couple: Row, matchKeys: (keyof Row)[]) => {
  let wins = 0;
  let totalSetsWon = 0;
  let totalSetsLost = 0;
  let totalGamesWon = 0;
  let totalGamesLost = 0;
  let playedAny = false;

  for (const key of matchKeys) {
    const score = couple[key];
    if (typeof score === 'string') {
      const cleanScore = score.trim();
      if (cleanScore && cleanScore !== '-') {
        playedAny = true;
        const sets = cleanScore.split(/\s+/).filter(Boolean);
        let setsWonThisMatch = 0;
        let setsLostThisMatch = 0;
        
        for (const set of sets) {
          const parts = set.split('-');
          if (parts.length === 2) {
            const g1 = parseInt(parts[0], 10);
            const g2 = parseInt(parts[1], 10);
            if (!isNaN(g1) && !isNaN(g2)) {
              // Game stats
              totalGamesWon += g1;
              totalGamesLost += g2;
              
              // Set stats
              if (g1 > g2) {
                setsWonThisMatch++;
              } else if (g2 > g1) {
                setsLostThisMatch++;
              }
            }
          }
        }
        
        if (setsWonThisMatch > setsLostThisMatch) {
          wins++;
        }
        
        totalSetsWon += setsWonThisMatch;
        totalSetsLost += setsLostThisMatch;
      }
    }
  }

  const setsDiff = totalSetsWon - totalSetsLost;
  const gamesDiff = totalGamesWon - totalGamesLost;

  return {
    wins: playedAny ? wins : 0,
    setsDiff: playedAny ? setsDiff : 0,
    gamesDiff: playedAny ? gamesDiff : 0,
    playedAny
  };
};

const getGroupMatches = (couples: any[]): { pareja1: string; pareja2: string; score: string }[] => {
  const matches: { pareja1: string; pareja2: string; score: string }[] = [];
  const n = couples.length;
  if (n <= 1) return [];

  if (n === 2) {
    const score = couples[0].m1vs2 || couples[1].m1vs2 || '';
    matches.push({ pareja1: couples[0].text, pareja2: couples[1].text, score });
  } else if (n === 3) {
    matches.push({ pareja1: couples[0].text, pareja2: couples[1].text, score: couples[0].m1vs2 || couples[1].m1vs2 || '' });
    matches.push({ pareja1: couples[0].text, pareja2: couples[2].text, score: couples[0].m1vs3 || couples[2].m1vs3 || '' });
    matches.push({ pareja1: couples[1].text, pareja2: couples[2].text, score: couples[1].m2vs3 || couples[2].m2vs3 || '' });
  } else {
    // n >= 4
    matches.push({ pareja1: couples[0].text, pareja2: couples[1].text, score: couples[0].m1vs2 || couples[1].m1vs2 || '' });
    matches.push({ pareja1: couples[2].text, pareja2: couples[3].text, score: couples[2].m1vs3 || couples[3].m1vs3 || '' });
    matches.push({ pareja1: couples[0].text, pareja2: couples[2].text, score: couples[0].m2vs3 || couples[2].m2vs3 || '' });
    matches.push({ pareja1: couples[1].text, pareja2: couples[3].text, score: couples[1].m2vs3 || couples[3].m2vs3 || '' });
    matches.push({ pareja1: couples[0].text, pareja2: couples[3].text, score: couples[0].g1vsP2 || couples[3].g1vsP2 || '' });
    matches.push({ pareja1: couples[1].text, pareja2: couples[2].text, score: couples[1].g1vsP2 || couples[2].g1vsP2 || '' });
  }
  return matches;
};

function extractSpreadsheetId(url: string): string | null {
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'parejas' | 'tab2'>('tab2');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState(() => {
    const saved = localStorage.getItem('parejas_sheets_url');
    if (!saved || saved.includes('AKfycbzjZ3xoMiaQZ71_ceoRuvN-M5YSaHsCBfoO7RlULEQ5YCWt_21Pwi0QptpRjcqBJ7KY') || saved.includes('AKfycbwKJX3xCnoSgnimqo4eEUDHj-10uccRKIDMqFChagnJH8_xaG2OERbbd1SdFAwBCfGT')) {
      return 'https://script.google.com/macros/s/AKfycbxFYXTY0QrK4nCDoPGKyuf9ew1CHZp7uh1daBd_Wi3GcndXU310nedOb4RhJBz5Q7u9/exec';
    }
    return saved;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(() => {
    const saved = localStorage.getItem('parejas_spreadsheet_url');
    if (!saved || saved.includes('1AZqGerLKE_j5FuEs6o8BzF_vUeGR3NSXWbnxLsQj8Ew')) {
      return 'https://docs.google.com/spreadsheets/d/1qqzQIJTS197yiXntoTDwFz6sKYM_zs8xkbMzC1hj_sk/edit?usp=sharing';
    }
    return saved;
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const [isPasswordInputVisible, setIsPasswordInputVisible] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const selectedFontFamily = 'Inter';
  const [selectedCategoryTab2Id, setSelectedCategoryTab2Id] = useState<string | null>(null);
  
  // Match score modal state
  interface MatchModalData {
    colKey: keyof Row;
    couple1: Row;
    couple2: Row;
    p1Index: number;
    p2Index: number;
    couple1Label: string;
    couple2Label: string;
    catId: string;
  }

  const [matchModalData, setMatchModalData] = useState<MatchModalData | null>(null);
  const [s1_p1, setS1P1] = useState('');
  const [s1_p2, setS1P2] = useState('');
  const [s2_p1, setS2P1] = useState('');
  const [s2_p2, setS2P2] = useState('');
  const [s3_p1, setS3P1] = useState('');
  const [s3_p2, setS3P2] = useState('');
  const [focusedCell, setFocusedCell] = useState<{ originalIndex: number; colKey: string } | null>(null);

  // Pre-populate match score modal inputs when opened
  useEffect(() => {
    if (matchModalData) {
      const existing = matchModalData.couple1[matchModalData.colKey] || '';
      const parts = existing.trim().split(/\s+/);
      
      const s1 = parts[0] ? parts[0].split('-') : [];
      const s2 = parts[1] ? parts[1].split('-') : [];
      const s3 = parts[2] ? parts[2].split('-') : [];

      setS1P1(s1[0] || '');
      setS1P2(s1[1] || '');
      setS2P1(s2[0] || '');
      setS2P2(s2[1] || '');
      setS3P1(s3[0] || '');
      setS3P2(s3[1] || '');
    }
  }, [matchModalData]);
  
  // Load categories from localStorage or fallback to default with structural migration
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('parejas_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((cat: any) => {
            const migratedRows = (cat.rows || []).map((row: any) => {
              if (typeof row === 'string') {
                return { text: row.toUpperCase(), group: '' };
              }
              return {
                text: (row.text || '').toUpperCase(),
                group: (row.group || '').toUpperCase(),
                m1vs2: row.m1vs2 || '',
                m1vs3: row.m1vs3 || '',
                m2vs3: row.m2vs3 || '',
                g1vsP2: row.g1vsP2 || '',
                wins: row.wins || '',
                setsDiff: row.setsDiff || '',
                gamesDiff: row.gamesDiff || ''
              };
            });
            return {
              id: cat.id || `cat-${Math.random()}`,
              name: (cat.name || '').toUpperCase(),
              rows: migratedRows
            };
          });
        }
      } catch (e) {
        console.error('Error parsing categories from localStorage:', e);
      }
    }
    return DEFAULT_CATEGORIES;
  });

  // Keep track of which categories are collapsed (optional visual preference)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [playoffs, setPlayoffs] = useState<Record<string, PlayoffMatch[]>>(() => {
    const saved = localStorage.getItem('parejas_playoffs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing playoffs:', e);
      }
    }
    return {};
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('parejas_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('parejas_playoffs', JSON.stringify(playoffs));
  }, [playoffs]);

  useEffect(() => {
    if (!isEditMode && activeTab === 'parejas') {
      setActiveTab('tab2');
    }
  }, [isEditMode, activeTab]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('parejas_sheets_url');
    const oldKeys = [
      'AKfycbzjZ3xoMiaQZ71_ceoRuvN-M5YSaHsCBfoO7RlULEQ5YCWt_21Pwi0QptpRjcqBJ7KY',
      'AKfycbwKJX3xCnoSgnimqo4eEUDHj-10uccRKIDMqFChagnJH8_xaG2OERbbd1SdFAwBCfGT'
    ];
    const isOldSheetsUrl = !savedUrl || oldKeys.some(k => savedUrl.includes(k));
    if (isOldSheetsUrl) {
      const newUrl = 'https://script.google.com/macros/s/AKfycbxFYXTY0QrK4nCDoPGKyuf9ew1CHZp7uh1daBd_Wi3GcndXU310nedOb4RhJBz5Q7u9/exec';
      setSheetsUrl(newUrl);
      localStorage.setItem('parejas_sheets_url', newUrl);
    }

    const savedSpreadsheetUrl = localStorage.getItem('parejas_spreadsheet_url');
    const isOldSpreadsheetUrl = !savedSpreadsheetUrl || savedSpreadsheetUrl.includes('1AZqGerLKE_j5FuEs6o8BzF_vUeGR3NSXWbnxLsQj8Ew');
    if (isOldSpreadsheetUrl) {
      const newSheetUrl = 'https://docs.google.com/spreadsheets/d/1qqzQIJTS197yiXntoTDwFz6sKYM_zs8xkbMzC1hj_sk/edit?usp=sharing';
      setSpreadsheetUrl(newSheetUrl);
      localStorage.setItem('parejas_spreadsheet_url', newSheetUrl);
    }
  }, []);







  const getCategoryPlayoffs = (catId: string): PlayoffMatch[] => {
    if (playoffs[catId] && playoffs[catId].length === 15) {
      return playoffs[catId];
    }
    return Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }));
  };

  const updatePlayoffMatchField = (catId: string, matchIdx: number, field: 'p1' | 'p2' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6', value: string) => {
    const current = playoffs[catId] ? playoffs[catId].map(m => ({
      p1: m.p1 || '',
      p2: m.p2 || '',
      s1: m.s1 || '',
      s2: m.s2 || '',
      s3: m.s3 || '',
      s4: m.s4 || '',
      s5: m.s5 || '',
      s6: m.s6 || ''
    })) : Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }));
    
    // Ensure the array has 15 items
    while (current.length < 15) {
      current.push({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' });
    }

    current[matchIdx] = {
      ...current[matchIdx],
      [field]: value.toUpperCase()
    };

    // Automated winner advancement helper
    if (['s1', 's2', 's3', 's4', 's5', 's6'].includes(field)) {
      const m = current[matchIdx];
      let setsP1 = 0;
      let setsP2 = 0;

      const s1Val = parseFloat(m.s1);
      const s2Val = parseFloat(m.s2);
      if (!isNaN(s1Val) && !isNaN(s2Val)) {
        if (s1Val > s2Val) setsP1++;
        else if (s2Val > s1Val) setsP2++;
      }

      const s3Val = parseFloat(m.s3 || '');
      const s4Val = parseFloat(m.s4 || '');
      if (!isNaN(s3Val) && !isNaN(s4Val)) {
        if (s3Val > s4Val) setsP1++;
        else if (s4Val > s3Val) setsP2++;
      }

      const s5Val = parseFloat(m.s5 || '');
      const s6Val = parseFloat(m.s6 || '');
      if (!isNaN(s5Val) && !isNaN(s6Val)) {
        if (s5Val > s6Val) setsP1++;
        else if (s6Val > s5Val) setsP2++;
      }

      const set1Done = !isNaN(s1Val) && !isNaN(s2Val);
      const set2Done = !isNaN(s3Val) && !isNaN(s4Val);
      const set3Done = !isNaN(s5Val) && !isNaN(s6Val);

      let winner = '';
      if (setsP1 === 2) {
        winner = m.p1;
      } else if (setsP2 === 2) {
        winner = m.p2;
      } else if (set1Done && !set2Done && !set3Done) {
        winner = s1Val > s2Val ? m.p1 : (s2Val > s1Val ? m.p2 : '');
      } else if (set1Done && set2Done && !set3Done) {
        if (setsP1 === 2) winner = m.p1;
        else if (setsP2 === 2) winner = m.p2;
        else winner = ''; // Tied 1-1, need set 3 to decide
      } else if (set3Done) {
        if (setsP1 > setsP2) winner = m.p1;
        else if (setsP2 > setsP1) winner = m.p2;
      }
      
      if (winner) {
        let nextMatchIdx = -1;
        let nextField: 'p1' | 'p2' = 'p1';
        
        if (matchIdx >= 0 && matchIdx <= 7) {
          nextMatchIdx = 8 + Math.floor(matchIdx / 2);
          nextField = (matchIdx % 2 === 0) ? 'p1' : 'p2';
        } else if (matchIdx >= 8 && matchIdx <= 11) {
          nextMatchIdx = 12 + Math.floor((matchIdx - 8) / 2);
          nextField = ((matchIdx - 8) % 2 === 0) ? 'p1' : 'p2';
        } else if (matchIdx >= 12 && matchIdx <= 13) {
          nextMatchIdx = 14;
          nextField = (matchIdx === 12) ? 'p1' : 'p2';
        }
        
        if (nextMatchIdx !== -1) {
          current[nextMatchIdx] = {
            ...current[nextMatchIdx],
            [nextField]: winner
          };
        }
      }
    }

    setPlayoffs(prev => ({
      ...prev,
      [catId]: current
    }));
  };

  const handleAutoFillOctavos = (catId: string) => {
    const selectedCategory = categories.find(c => c.id === catId);
    if (!selectedCategory) return;

    const activeCouples = selectedCategory.rows
      .map((r, i) => ({ ...r, originalIndex: i + 1 }))
      .filter(r => r.text && r.text.trim() !== '' && r.group && r.group.trim() !== '');

    // Group active couples by group
    const groupsMap: { [key: string]: typeof activeCouples } = {};
    activeCouples.forEach(couple => {
      const g = couple.group.toUpperCase();
      if (!groupsMap[g]) {
        groupsMap[g] = [];
      }
      groupsMap[g].push(couple);
    });

    const groupStandings: { groupName: string; couples: any[] }[] = [];
    
    Object.keys(groupsMap).forEach(gName => {
      const couples = groupsMap[gName].map(c => {
        const stats = calculateCoupleStats(c, ['m1vs2', 'm1vs3', 'm2vs3', 'g1vsP2']);
        return {
          ...c,
          stats
        };
      });

      // Sort couples by: wins DESC, setsDiff DESC, gamesDiff DESC
      couples.sort((a, b) => {
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        if (b.stats.setsDiff !== a.stats.setsDiff) return b.stats.setsDiff - a.stats.setsDiff;
        return b.stats.gamesDiff - a.stats.gamesDiff;
      });

      groupStandings.push({ groupName: gName, couples });
    });

    // Sort groupStandings alphabetically by group name
    groupStandings.sort((a, b) => a.groupName.localeCompare(b.groupName));

    // Gather top couples to fill 16 slots.
    const candidates: string[] = [];
    
    // First, add all 1st places
    groupStandings.forEach(g => {
      if (g.couples[0]) candidates.push(g.couples[0].text);
    });
    // Then, add all 2nd places
    groupStandings.forEach(g => {
      if (g.couples[1]) candidates.push(g.couples[1].text);
    });
    // Then, add remaining places if we still don't have 16
    for (let i = 2; i < 10; i++) {
      groupStandings.forEach(g => {
        if (g.couples[i] && candidates.length < 16) {
          candidates.push(g.couples[i].text);
        }
      });
    }

    // Fallback to fill up to 16 with empty strings
    while (candidates.length < 16) {
      candidates.push('');
    }

    // Populate Octavos matches (Match 0 to 7)
    const current = Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }));
    for (let i = 0; i < 8; i++) {
      current[i] = {
        p1: candidates[i * 2] || '',
        p2: candidates[i * 2 + 1] || '',
        s1: '',
        s2: '',
        s3: '',
        s4: '',
        s5: '',
        s6: ''
      };
    }

    setPlayoffs(prev => ({
      ...prev,
      [catId]: current
    }));
  };

  // Operations
  const openAddCategoryModal = () => {
    setNewCategoryName('');
    setShowAddModal(true);
  };

  const confirmAddCategory = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newCategoryName.trim().toUpperCase();
    if (!cleanName) {
      alert('Por favor ingrese un nombre de categoría válido.');
      return;
    }
    if (categories.some(c => c.name.trim().toUpperCase() === cleanName)) {
      alert('Ya existe una categoría con ese nombre.');
      return;
    }
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = {
      id: newId,
      name: cleanName,
      rows: Array(15).fill(null).map(() => ({ text: '', group: '' }))
    };
    setCategories([...categories, newCategory]);
    setShowAddModal(false);
    setNewCategoryName('');
  };

  const removeCategory = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta categoría por completo?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const updateCategoryName = (id: string, name: string) => {
    setCategories(categories.map(c => 
      c.id === id ? { ...c, name: name.toUpperCase() } : c
    ));
  };

  const updateRowText = (catId: string, rowIndex: number, text: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const newRows = [...c.rows];
        newRows[rowIndex] = { ...newRows[rowIndex], text: text.toUpperCase() };
        return { ...c, rows: newRows };
      }
      return c;
    }));
  };

  const updateRowGroup = (catId: string, rowIndex: number, group: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const newRows = [...c.rows];
        newRows[rowIndex] = { ...newRows[rowIndex], group };
        return { ...c, rows: newRows };
      }
      return c;
    }));
  };

  const updateRowField = (catId: string, rowIndex: number, field: keyof Row, value: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        const newRows = [...c.rows];
        newRows[rowIndex] = { ...newRows[rowIndex], [field]: value };
        return { ...c, rows: newRows };
      }
      return c;
    }));
  };

  const updateMatchScore = (catId: string, p1RowIndex: number, p2RowIndex: number, colKey: keyof Row, score1: string, score2: string) => {
    setCategories(prevCategories => prevCategories.map(c => {
      if (c.id === catId) {
        const newRows = [...c.rows];
        newRows[p1RowIndex] = { ...newRows[p1RowIndex], [colKey]: score1 };
        newRows[p2RowIndex] = { ...newRows[p2RowIndex], [colKey]: score2 };
        return { ...c, rows: newRows };
      }
      return c;
    }));
  };

  const handleHeaderClick = (colLabel: string, colKey: keyof Row, couplesInGroup: any[], catId: string) => {
    const match = colLabel.match(/^(\d+)vs(\d+)$/i);
    if (!match) return;
    const p1Idx = parseInt(match[1], 10) - 1;
    const p2Idx = parseInt(match[2], 10) - 1;
    
    const couple1 = couplesInGroup[p1Idx];
    const couple2 = couplesInGroup[p2Idx];
    
    if (couple1 && couple2) {
      setMatchModalData({
        colKey,
        couple1,
        couple2,
        p1Index: couple1.originalIndex - 1,
        p2Index: couple2.originalIndex - 1,
        couple1Label: `${p1Idx + 1}. ${couple1.text || 'PAREJA ' + (p1Idx + 1)}`,
        couple2Label: `${p2Idx + 1}. ${couple2.text || 'PAREJA ' + (p2Idx + 1)}`,
        catId
      });
    }
  };

  const handleSaveMatchScore = () => {
    if (!matchModalData) return;
    
    const setsList: { p1: string; p2: string }[] = [];
    if (s1_p1 !== '' || s1_p2 !== '') {
      setsList.push({ p1: s1_p1 || '0', p2: s1_p2 || '0' });
    }
    if (s2_p1 !== '' || s2_p2 !== '') {
      setsList.push({ p1: s2_p1 || '0', p2: s2_p2 || '0' });
    }
    if (s3_p1 !== '' || s3_p2 !== '') {
      setsList.push({ p1: s3_p1 || '0', p2: s3_p2 || '0' });
    }

    const score1 = setsList.map(s => `${s.p1}-${s.p2}`).join(' ');
    const score2 = setsList.map(s => `${s.p2}-${s.p1}`).join(' ');

    updateMatchScore(
      matchModalData.catId,
      matchModalData.p1Index,
      matchModalData.p2Index,
      matchModalData.colKey,
      score1,
      score2
    );

    setMatchModalData(null);
  };

  const addRowToCategory = (catId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, rows: [...c.rows, { text: '', group: '' }] };
      }
      return c;
    }));
  };

  const removeLastRowFromCategory = (catId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        if (c.rows.length === 0) return c;
        return { ...c, rows: c.rows.slice(0, -1) };
      }
      return c;
    }));
  };

  const clearAllData = () => {
    if (window.confirm('¿Desea restablecer toda la planilla? Esto borrará todas las categorías y textos agregados.')) {
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Export JSON file for user convenience
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `planilla_parejas_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleExportToSheets = async () => {
    if (!sheetsUrl || !sheetsUrl.trim()) {
      alert("Por favor ingrese la URL de Google Apps Script.");
      return;
    }

    setSyncStatus('syncing');
    localStorage.setItem('parejas_sheets_url', sheetsUrl.trim());
    localStorage.setItem('parejas_spreadsheet_url', spreadsheetUrl.trim());

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);

    try {
      const payloadCategories = categories.map(cat => {
        // 1. Couples list
        const couplesPayload = cat.rows.map((row, rIdx) => ({
          numero: rIdx + 1,
          grupo: (row.group || '').toUpperCase(),
          pareja: (row.text || '').toUpperCase()
        })).filter(c => c.pareja.trim() !== '');

        // 2. Groups classification
        const activeCouples = cat.rows
          .map((r, i) => ({ ...r, originalIndex: i + 1 }))
          .filter(r => r.text && r.text.trim() !== '' && r.group && r.group.trim() !== '');

        const groupsMap: { [key: string]: typeof activeCouples } = {};
        activeCouples.forEach(couple => {
          const g = couple.group.toUpperCase();
          if (!groupsMap[g]) groupsMap[g] = [];
          groupsMap[g].push(couple);
        });

        const sortedGroupNames = Object.keys(groupsMap).sort();
        const groupsPayload = sortedGroupNames.map(groupName => {
          const couplesInGroup = groupsMap[groupName];
          const numCouples = couplesInGroup.length;
          const isFourOrMore = numCouples >= 4;

          const matchCols = isFourOrMore
            ? [
                { key: 'm1vs2' as const, label: '1vs2' },
                { key: 'm1vs3' as const, label: '3vs4' },
                { key: 'm2vs3' as const, label: '\u00A0' },
                { key: 'g1vsP2' as const, label: '\u00A0' }
              ]
            : [
                { key: 'm1vs2' as const, label: '1vs2' },
                { key: 'm1vs3' as const, label: '1vs3' },
                { key: 'm2vs3' as const, label: '2vs3' }
              ];

          const couplesStats = couplesInGroup.map((couple, index) => {
            const matchKeys = matchCols.map(col => col.key);
            const stats = calculateCoupleStats(couple, matchKeys);

            const scoresMap: Record<string, string> = {};
            matchCols.forEach(col => {
              scoresMap[col.label] = couple[col.key] || '';
            });

            return {
              fila: index + 1,
              pareja: couple.text,
              scores: scoresMap,
              wins: stats.playedAny ? stats.wins : 0,
              setsDiff: stats.playedAny ? stats.setsDiff : 0,
              gamesDiff: stats.playedAny ? stats.gamesDiff : 0
            };
          });

          return {
            groupName,
            matchHeaders: matchCols.map(col => col.label),
            couples: couplesStats
          };
        });

        // 3. Playoff matches
        const playoffList = getCategoryPlayoffs(cat.id);
        const playoffMatchesPayload = playoffList.map((m, idx) => {
          let label = '';
          if (idx >= 0 && idx <= 7) {
            label = `octavos${idx + 1}`;
          } else if (idx >= 8 && idx <= 11) {
            label = `cuartos${idx - 7}`;
          } else if (idx >= 12 && idx <= 13) {
            label = `semifinal${idx - 11}`;
          } else if (idx === 14) {
            label = 'final';
          }

          const setsArr = [];
          if (m.s1 !== '' && m.s2 !== '' && m.s1 !== undefined && m.s2 !== undefined) {
            setsArr.push(`${m.s1}-${m.s2}`);
          }
          if (m.s3 !== '' && m.s4 !== '' && m.s3 !== undefined && m.s4 !== undefined) {
            setsArr.push(`${m.s3}-${m.s4}`);
          }
          if (m.s5 !== '' && m.s6 !== '' && m.s5 !== undefined && m.s6 !== undefined) {
            setsArr.push(`${m.s5}-${m.s6}`);
          }
          const scoreStr = setsArr.join(' ');

          return {
            label,
            pareja1: m.p1 || '',
            pareja2: m.p2 || '',
            set1: scoreStr,
            set2: '',
            set3: ''
          };
        });

        return {
          name: cat.name,
          couples: couplesPayload,
          groups: groupsPayload,
          playoffs: playoffMatchesPayload
        };
      });

      // Prepare rawState for perfect loss-less backup & import
      const rawState = {
        categories,
        playoffs
      };

      // POST to Google Apps Script.
      await fetch(sheetsUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ 
          spreadsheetId: spreadsheetId || '',
          categories: payloadCategories,
          rawState: rawState
        })
      });

      setSyncStatus('success');
      alert('Sincronización enviada con éxito a Google Sheets.');
      setTimeout(() => {
        setSyncStatus('idle');
        setShowExportModal(false);
      }, 1500);
    } catch (err) {
      console.error('Error al exportar a Google Sheets:', err);
      setSyncStatus('error');
      alert('Hubo un error al conectar con Google Sheets. Verifique la URL de Apps Script.');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  const handleImportFromSheets = async () => {
    if (!spreadsheetUrl || !spreadsheetUrl.trim()) {
      alert("Por favor ingrese la URL de la Planilla de Google Sheets.");
      return;
    }

    setSyncStatus('syncing');
    localStorage.setItem('parejas_spreadsheet_url', spreadsheetUrl.trim());

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setSyncStatus('error');
      alert("La URL de la Planilla no es válida o no contiene un ID de documento.");
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    try {
      // Direct public fetch using Google Visualization Query API
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=__raw_data_backup__`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("No se pudo conectar con Google Sheets. Verifique la conexión.");
      }
      const text = await response.text();
      
      // Detect if Google returned an HTML page (usually the login/permission page or a 404 page)
      if (text.includes("<!DOCTYPE html>") || text.includes("<html") || !text.includes("google.visualization.Query.setResponse")) {
        throw new Error("La planilla no tiene acceso público. Por favor, en tu Google Sheets haz clic en el botón 'Compartir' (arriba a la derecha) y cambia el acceso general de 'Restringido' a 'Cualquiera con el enlace' (con permiso de Lector).");
      }
      
      // Parse the gviz JSON response
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("La respuesta de Google Sheets no tiene el formato de datos esperado.");
      }
      
      const jsonStr = text.substring(startIdx, endIdx + 1);
      let gviz;
      try {
        gviz = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("La planilla no tiene acceso público. Por favor, en tu Google Sheets haz clic en el botón 'Compartir' (arriba a la derecha) y cambia el acceso general de 'Restringido' a 'Cualquiera con el enlace' (con permiso de Lector).");
      }
      
      if (gviz.status === 'error') {
        const errorMsg = gviz.errors?.[0]?.detailed_message || "";
        if (errorMsg.includes("no existe") || errorMsg.includes("not found")) {
          throw new Error("La hoja de respaldo interna '__raw_data_backup__' no se encuentra en esta planilla. Por favor, entra al 'Modo Edición' y realiza una primera exportación usando Apps Script para crearla e inicializar los datos.");
        }
        throw new Error(errorMsg || "Error al leer la hoja de copia de seguridad.");
      }
      
      let rawBackupStr = '';
      if (gviz.table && Array.isArray(gviz.table.rows)) {
        for (const r of gviz.table.rows) {
          if (r && Array.isArray(r.c) && r.c[0] && r.c[0].v !== null && r.c[0].v !== undefined) {
            rawBackupStr += r.c[0].v;
          }
        }
      }

      if (!rawBackupStr || !rawBackupStr.trim()) {
        throw new Error("La hoja de copia de seguridad está vacía o no existe. Es posible que el administrador no haya exportado los datos todavía.");
      }

      const parsedState = JSON.parse(rawBackupStr);
      if (parsedState && parsedState.categories && Array.isArray(parsedState.categories)) {
        setCategories(parsedState.categories);
        if (parsedState.playoffs) {
          setPlayoffs(parsedState.playoffs);
        } else {
          setPlayoffs({});
        }
      } else if (Array.isArray(parsedState)) {
        setCategories(parsedState);
      } else {
        throw new Error("El formato de la copia de seguridad no es válido.");
      }

      setSyncStatus('success');
      setShowSyncSuccessToast(true);
      setTimeout(() => {
        setShowSyncSuccessToast(false);
        setSyncStatus('idle');
        setShowExportModal(false);
      }, 1000);
      return; // Return early to bypass legacy custom parsing below

      const migratedCategories: Category[] = [];
      const newPlayoffs: Record<string, PlayoffMatch[]> = {};

      const parsedBackup: any[] = [];
      parsedBackup.forEach((cat: any) => {
        const catName = (cat.name || '').toUpperCase();
        const catId = cat.id || `cat_${catName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        
        const couplesMap: Record<string, Row> = {};

        // 1. Initialize with couples list
        if (Array.isArray(cat.couples)) {
          cat.couples.forEach((cp: any) => {
            const cpName = (cp.pareja || '').toUpperCase();
            if (cpName) {
              couplesMap[cpName] = {
                text: cpName,
                group: (cp.grupo || '').toUpperCase(),
                m1vs2: '',
                m1vs3: '',
                m2vs3: '',
                g1vsP2: '',
                wins: '',
                setsDiff: '',
                gamesDiff: ''
              };
            }
          });
        }

        // 2. Add group metrics
        if (Array.isArray(cat.groups)) {
          cat.groups.forEach((gr: any) => {
            const grName = (gr.groupName || '').toUpperCase();
            const matchHeaders = gr.matchHeaders || [];
            if (Array.isArray(gr.couples)) {
              gr.couples.forEach((gcp: any) => {
                const cpName = (gcp.pareja || '').toUpperCase();
                if (!cpName) return;

                if (!couplesMap[cpName]) {
                  couplesMap[cpName] = {
                    text: cpName,
                    group: grName,
                    m1vs2: '',
                    m1vs3: '',
                    m2vs3: '',
                    g1vsP2: '',
                    wins: '',
                    setsDiff: '',
                    gamesDiff: ''
                  };
                }

                // Map match scores
                if (gcp.scores) {
                  if (matchHeaders.indexOf("1vs2") !== -1) couplesMap[cpName].m1vs2 = gcp.scores["1vs2"] || "";
                  if (matchHeaders.indexOf("3vs4") !== -1) couplesMap[cpName].m1vs3 = gcp.scores["3vs4"] || "";
                  if (matchHeaders.indexOf("1vs3") !== -1) couplesMap[cpName].m1vs3 = gcp.scores["1vs3"] || "";
                  if (matchHeaders.indexOf("2vs3") !== -1) couplesMap[cpName].m2vs3 = gcp.scores["2vs3"] || "";

                  const otherHeaders = Object.keys(gcp.scores);
                  otherHeaders.forEach((oh: string) => {
                    if (oh !== "1vs2" && oh !== "3vs4" && oh !== "1vs3" && oh !== "2vs3") {
                      couplesMap[cpName].g1vsP2 = gcp.scores[oh] || "";
                    }
                  });
                }

                couplesMap[cpName].wins = gcp.wins !== undefined ? gcp.wins.toString() : '';
                couplesMap[cpName].setsDiff = gcp.setsDiff !== undefined ? gcp.setsDiff.toString() : '';
                couplesMap[cpName].gamesDiff = gcp.gamesDiff !== undefined ? gcp.gamesDiff.toString() : '';
              });
            }
          });
        }

        const rows = Object.values(couplesMap);

        migratedCategories.push({
          id: catId,
          name: catName,
          rows: rows
        });

        // 3. Map playoffs
        if (Array.isArray(cat.playoffs)) {
          newPlayoffs[catId] = cat.playoffs.map((m: any) => {
            let s1 = '', s2 = '', s3 = '', s4 = '', s5 = '', s6 = '';
            const rawScore = m.set1 || m.resultado || '';
            if (rawScore && typeof rawScore === 'string' && rawScore.includes('-')) {
              const sets = rawScore.trim().split(/\s+/);
              if (sets[0] && sets[0].includes('-')) {
                const parts = sets[0].split('-');
                s1 = parts[0] || '';
                s2 = parts[1] || '';
              }
              if (sets[1] && sets[1].includes('-')) {
                const parts = sets[1].split('-');
                s3 = parts[0] || '';
                s4 = parts[1] || '';
              }
              if (sets[2] && sets[2].includes('-')) {
                const parts = sets[2].split('-');
                s5 = parts[0] || '';
                s6 = parts[1] || '';
              }
            } else {
              s1 = m.s1 !== undefined ? m.s1.toString() : '';
              s2 = m.s2 !== undefined ? m.s2.toString() : '';
              s3 = m.s3 !== undefined ? m.s3.toString() : '';
              s4 = m.s4 !== undefined ? m.s4.toString() : '';
              s5 = m.s5 !== undefined ? m.s5.toString() : '';
              s6 = m.s6 !== undefined ? m.s6.toString() : '';
            }

            return {
              p1: (m.p1 || m.pareja1 || '').toUpperCase(),
              p2: (m.p2 || m.pareja2 || '').toUpperCase(),
              s1,
              s2,
              s3,
              s4,
              s5,
              s6
            };
          });
        } else {
          newPlayoffs[catId] = Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }));
        }
      });

      setCategories(migratedCategories);
      setPlayoffs(newPlayoffs);

      setSyncStatus('success');
      setShowSyncSuccessToast(true);
      setTimeout(() => {
        setShowSyncSuccessToast(false);
        setSyncStatus('idle');
      }, 1000);

    } catch (err: any) {
      console.error("Error al importar directamente:", err);
      setSyncStatus('error');
      alert(`No se pudo importar directamente: ${err.message || 'Verifique que la URL de la Planilla sea correcta y que la hoja esté compartida como "Cualquiera con el enlace puede ver".'}`);
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleImportFromSheetsOld = async () => {
    if (!sheetsUrl || !sheetsUrl.trim()) {
      alert("Por favor ingrese la URL de Google Apps Script.");
      return;
    }
    if (!spreadsheetUrl || !spreadsheetUrl.trim()) {
      alert("Por favor ingrese la URL de la Planilla de Google Sheets.");
      return;
    }

    setSyncStatus('syncing');
    localStorage.setItem('parejas_sheets_url', sheetsUrl.trim());
    localStorage.setItem('parejas_spreadsheet_url', spreadsheetUrl.trim());

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setSyncStatus('error');
      alert("La URL de la Planilla no es válida o no contiene un ID de documento.");
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    try {
      const response = await fetch(`${sheetsUrl.trim()}?action=import&spreadsheetId=${spreadsheetId}`);
      if (!response.ok) {
        throw new Error("La Web App de Google Apps Script no respondió correctamente.");
      }
      const data = await response.json();

      if (data && data.error) {
        throw new Error(data.error);
      }

      if (data && Array.isArray(data.categories)) {
        // Map the imported categories
        const migrated = data.categories.map((cat: any) => {
          const newId = cat.id || `cat-${Math.random().toString(36).substr(2, 9)}`;
          const rows = (cat.rows || []).map((row: any) => {
            return {
              text: (row.text || row.pareja || '').toUpperCase(),
              group: (row.group || row.grupo || '').toUpperCase(),
              m1vs2: row.m1vs2 || '',
              m1vs3: row.m1vs3 || '',
              m2vs3: row.m2vs3 || '',
              g1vsP2: row.g1vsP2 || '',
              wins: row.wins || '',
              setsDiff: row.setsDiff || '',
              gamesDiff: row.gamesDiff || ''
            };
          });

          return {
            id: newId,
            name: (cat.name || '').toUpperCase(),
            rows
          };
        });

        // Set the migrated categories
        setCategories(migrated);

        // Map and set the playoffs using the new category IDs
        const newPlayoffs: Record<string, PlayoffMatch[]> = {};
        migrated.forEach((cat: any) => {
          const playoffDataForCat = data.playoffs && data.playoffs[cat.name];
          if (playoffDataForCat && playoffDataForCat.length === 15) {
            newPlayoffs[cat.id] = playoffDataForCat.map((m: any) => {
              // Parse sets
              let s1 = '', s2 = '', s3 = '', s4 = '', s5 = '', s6 = '';
              const rawScore = m.set1 || m.resultado || '';
              if (rawScore && typeof rawScore === 'string' && rawScore.includes('-')) {
                const sets = rawScore.trim().split(/\s+/);
                if (sets[0] && sets[0].includes('-')) {
                  const parts = sets[0].split('-');
                  s1 = parts[0] || '';
                  s2 = parts[1] || '';
                }
                if (sets[1] && sets[1].includes('-')) {
                  const parts = sets[1].split('-');
                  s3 = parts[0] || '';
                  s4 = parts[1] || '';
                }
                if (sets[2] && sets[2].includes('-')) {
                  const parts = sets[2].split('-');
                  s5 = parts[0] || '';
                  s6 = parts[1] || '';
                }
              } else {
                s1 = m.s1 !== undefined ? m.s1.toString() : '';
                s2 = m.s2 !== undefined ? m.s2.toString() : '';
                s3 = m.s3 !== undefined ? m.s3.toString() : '';
                s4 = m.s4 !== undefined ? m.s4.toString() : '';
                s5 = m.s5 !== undefined ? m.s5.toString() : '';
                s6 = m.s6 !== undefined ? m.s6.toString() : '';
              }

              return {
                p1: (m.p1 || m.pareja1 || '').toUpperCase(),
                p2: (m.p2 || m.pareja2 || '').toUpperCase(),
                s1,
                s2,
                s3,
                s4,
                s5,
                s6
              };
            });
          } else {
            newPlayoffs[cat.id] = Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }));
          }
        });

        setPlayoffs(newPlayoffs);

        setSyncStatus('success');
        setShowSyncSuccessToast(true);
        setTimeout(() => {
          setShowSyncSuccessToast(false);
          setSyncStatus('idle');
          setShowExportModal(false);
        }, 1000);
      } else {
        throw new Error('La respuesta no contiene una lista de categorías válida.');
      }
    } catch (err: any) {
      console.error('Error al importar desde Google Sheets:', err);
      setSyncStatus('error');
      
      const isFailedToFetch = err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch') || err.message.includes('NetworkError'));
      if (isFailedToFetch) {
        alert(
          "Error al importar: No se pudo conectar con Google Apps Script.\n\n" +
          "Esto suele deberse a un bloqueo de seguridad (CORS) causado por:\n" +
          "1. La Web App de Google Apps Script no tiene los permisos correctos. Asegúrate de volver a implementarla (Nueva Implementación) configurando:\n" +
          "   - Ejecutar como: 'Yo' (Tu cuenta)\n" +
          "   - Quién tiene acceso: 'Cualquiera' (Anyone)\n" +
          "2. No has autorizado el script en tu cuenta de Google. Abre tu editor de Google Apps Script y haz clic en 'Ejecutar' (Run) en la función doGet o doPost una vez para aprobar los permisos de Drive y Sheets.\n" +
          "3. El ID de la planilla no existe o no tienes acceso."
        );
      } else {
        alert(`Hubo un error al importar: ${err.message || 'Verifique que la URL de la Planilla y del Script sean correctas.'}`);
      }
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // Import JSON file
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // simple validation of structure
          const isValid = parsed.every(item => 
            typeof item === 'object' && 
            'name' in item && 
            'rows' in item && 
            Array.isArray(item.rows)
          );
          if (isValid) {
            const migrated = parsed.map((cat: any) => {
              const migratedRows = (cat.rows || []).map((row: any) => {
                if (typeof row === 'string') {
                  return { text: row.toUpperCase(), group: '' };
                }
                return {
                  text: (row.text || '').toUpperCase(),
                  group: (row.group || '').toUpperCase(),
                  m1vs2: row.m1vs2 || '',
                  m1vs3: row.m1vs3 || '',
                  m2vs3: row.m2vs3 || '',
                  g1vsP2: row.g1vsP2 || '',
                  wins: row.wins || '',
                  setsDiff: row.setsDiff || '',
                  gamesDiff: row.gamesDiff || ''
                };
              });
              return {
                id: cat.id || `cat-${Math.random()}`,
                name: (cat.name || '').toUpperCase(),
                rows: migratedRows
              };
            });
            setCategories(migrated);
            setShowSyncSuccessToast(true);
            setTimeout(() => {
              setShowSyncSuccessToast(false);
            }, 1000);
          } else {
            alert('El archivo no tiene el formato de planilla válido.');
          }
        }
      } catch (err) {
        alert('Error al leer el archivo. Asegúrese de que sea un JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col font-sans">
      <style>{`
        .app-spreadsheet-font,
        .app-spreadsheet-font input,
        .app-spreadsheet-font select,
        .app-spreadsheet-font span,
        .app-spreadsheet-font td,
        .app-spreadsheet-font th,
        .app-spreadsheet-font option,
        .app-spreadsheet-font div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>
      {/* Upper Elegant Brand and Navigation bar */}
      <nav className="h-16 border-b border-white/10 flex items-center px-4 md:px-12 justify-between bg-[#111]" id="brand-nav-bar">
        <div className="flex gap-4 md:gap-8 h-full items-center">
          {isEditMode && (
            <button
              onClick={() => setActiveTab('parejas')}
              className={`h-full flex items-center font-medium tracking-widest cursor-pointer px-3 text-xs md:text-sm transition-all border-b-2 uppercase ${
                activeTab === 'parejas'
                  ? 'border-[#c5a059] text-[#c5a059]'
                  : 'border-transparent text-white/30 hover:text-white/50'
              }`}
              id="tab-btn-parejas"
            >
              LISTADO DE PAREJAS
            </button>
          )}

          <button
            onClick={() => setActiveTab('tab2')}
            className={`h-full flex items-center font-medium tracking-widest cursor-pointer px-3 text-xs md:text-sm transition-all border-b-2 uppercase ${
              activeTab === 'tab2'
                ? 'border-[#c5a059] text-[#c5a059]'
                : 'border-transparent text-white/30 hover:text-white/50'
            }`}
            id="tab-btn-p2"
          >
            CATEGORÍAS
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {isEditMode && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-900 border border-white/5 font-mono text-[9px] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-amber-400 font-bold">Modo Edición</span>
            </div>
          )}

          <button
            onClick={() => {
              if (isEditMode) {
                setIsEditMode(false);
              } else {
                setShowNoAccessModal(true);
                setIsPasswordInputVisible(false);
                setAccessPassword('');
              }
            }}
            className="p-1.5 hover:bg-white/5 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none"
            title={isEditMode ? "Modo Edición - Click para Cambiar a Vista (Bloquear)" : "Modo Vista - Click para Cambiar a Edición (Desbloquear)"}
            id="toggle-edit-mode-btn"
          >
            {isEditMode ? (
              <Unlock className="h-4.5 w-4.5 text-amber-400 cursor-pointer" />
            ) : (
              <Lock className="h-4.5 w-4.5 text-zinc-600 hover:text-zinc-400 cursor-pointer" />
            )}
          </button>
        </div>
      </nav>

      {/* Utility / Admin bar */}
      <div className="bg-[#0e0e0e] border-b border-white/5 px-4 md:px-12 py-3">
        <div className="max-w-6xl mx-auto">
          {!isEditMode ? (
            // VIEW MODE (PUBLIC) UI - Direct public fetch button
            <div className="flex justify-center">
              <button
                onClick={handleImportFromSheets}
                disabled={syncStatus === 'syncing'}
                className={`flex items-center gap-2 px-6 py-2.5 text-[10px] uppercase tracking-wider font-extrabold rounded-sm transition-all shadow-md ${
                  syncStatus === 'syncing'
                    ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    : 'bg-[#c5a059] hover:bg-[#d4b476] text-black hover:shadow-[#c5a059]/10'
                }`}
                id="btn-direct-import"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 text-black" />
                    <span>Sincronizar Planilla</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // EDIT MODE (ADMIN) UI - Full write operations
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Auto-guardado (Navegador)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowExportModal(true)}
                  title="Exportar planilla a Google Sheets con Apps Script"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-[#c5a059] border border-[#c5a059]/20 hover:border-[#c5a059]/50 rounded-sm transition-all"
                  id="btn-export"
                >
                  <Download className="h-3 w-3" />
                  <span>Exportar a Google Sheets</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className={`flex-1 w-full mx-auto transition-all duration-300 ${activeTab === 'tab2' && selectedCategoryTab2Id ? 'max-w-none p-0' : 'max-w-6xl p-4 md:p-8'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'parejas' && (
            <motion.div
              key="parejas-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
              id="tab-content-parejas"
            >
              {/* Toolbar Section */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-light tracking-tighter text-white" id="app-main-title">Listado de Parejas</h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-mono">Categorías registradas: {categories.length}</p>
                  </div>
                </div>
                {isEditMode && (
                  <button
                    onClick={openAddCategoryModal}
                    className="px-6 py-2.5 bg-[#c5a059] hover:bg-[#d4b476] text-black text-xs font-bold uppercase tracking-widest transition-colors rounded-sm shadow-lg hover:shadow-[#c5a059]/10"
                    id="btn-add-category"
                  >
                    + Agregar Categoría
                  </button>
                )}
              </div>

              {/* Grid / List of Category Sheets */}
              {categories.length === 0 ? (
                <div className="text-center py-20 bg-[#111] rounded-sm border border-white/5 p-8 max-w-lg mx-auto">
                  <FileSpreadsheet className="h-10 w-10 text-[#c5a059] mx-auto mb-4 opacity-70" />
                  <p className="text-white/60 font-medium text-lg">No hay categorías registradas</p>
                  <p className="text-xs text-white/30 tracking-wider uppercase mt-2">Cree una categoría para visualizar la planilla</p>
                  {isEditMode && (
                    <button
                      onClick={openAddCategoryModal}
                      className="mt-6 px-5 py-2 bg-[#c5a059] hover:bg-[#d4b476] text-black text-xs font-bold uppercase tracking-widest rounded-sm transition shadow-md"
                    >
                      Crear Categoría
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {categories.map((category, catIndex) => {
                    const isCollapsed = !!collapsedCategories[category.id];
                    return (
                      <div 
                        key={category.id} 
                        className="bg-white text-black shadow-[20px_20px_60px_rgba(0,0,0,0.5)] rounded-sm flex flex-col border border-white/20 overflow-hidden"
                        id={`category-card-${category.id}`}
                      >
                        {/* Upper Elegant Header for each category */}
                        <div className="bg-neutral-100 border-b border-black/10 px-4 py-3 flex justify-between items-center text-black">
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <span className="text-xs font-serif uppercase bg-black text-[#c5a059] px-2.5 py-1 rounded-sm font-bold tracking-wider truncate max-w-[185px] sm:max-w-[280px]" title={category.name}>
                              {category.name || `CATEGORÍA ${catIndex + 1}`}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                              (#{catIndex + 1})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleCollapse(category.id)}
                              className="text-[10px] text-neutral-500 hover:text-black uppercase font-bold tracking-wider transition"
                              title={isCollapsed ? "Ver Planilla" : "Contraer"}
                            >
                              {isCollapsed ? "Expandir ⇣" : "Contraer ⇡"}
                            </button>
                            {isEditMode && (
                              <button
                                onClick={() => removeCategory(category.id)}
                                className="p-1 text-neutral-400 hover:text-rose-700 transition"
                                title="Eliminar esta categoría"
                                id={`delete-cat-btn-${category.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Container */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto app-spreadsheet-font planilla-60">
                            {/* Crisply Styled Spreadsheet Table: White Background, Black Text, Clean Gridlines */}
                            <table className="w-full border-collapse bg-white text-black text-sm" id={`table-${category.id}`}>
                              <tbody>
                                {/* 1. First Row: Category Name Input */}
                                <tr className="border-b border-neutral-300">
                                  <td className="w-12 bg-neutral-200 border-r border-neutral-300 font-mono text-[10px] text-center font-bold text-neutral-600 select-none">
                                    HDR
                                  </td>
                                  <td className="p-0" colSpan={2}>
                                    <input
                                      type="text"
                                      disabled={!isEditMode}
                                      value={category.name}
                                      onChange={(e) => updateCategoryName(category.id, e.target.value)}
                                      className="w-full px-4 py-3 bg-white text-black font-extrabold text-sm tracking-wider border-0 focus:outline-none focus:ring-1 focus:ring-[#c5a059] uppercase placeholder-neutral-400 font-sans disabled:opacity-95 disabled:cursor-default"
                                      placeholder="ESCRIBA EL NOMBRE DE LA CATEGORÍA..."
                                      id={`cat-input-${category.id}`}
                                    />
                                  </td>
                                </tr>

                                {/* 2. Rows: text input rows with group select dropdown */}
                                {category.rows.map((row, rowIndex) => (
                                  <tr 
                                    key={rowIndex} 
                                    className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors"
                                  >
                                    {/* Number Cell */}
                                    <td className="w-12 bg-neutral-100 border-r border-neutral-200 font-mono text-[10px] text-center text-neutral-400 select-none py-2">
                                      {String(rowIndex + 1).padStart(2, '0')}
                                    </td>
                                    
                                    {/* Group Selection Dropdown */}
                                    <td className="w-24 bg-neutral-50 border-r border-neutral-200 p-0">
                                      <select
                                        disabled={!isEditMode}
                                        value={row.group || ''}
                                        onChange={(e) => updateRowGroup(category.id, rowIndex, e.target.value)}
                                        className="w-full h-full text-center font-mono font-bold text-xs bg-transparent text-neutral-700 focus:outline-none focus:bg-neutral-100/50 border-0 cursor-pointer py-2.5 uppercase appearance-none disabled:opacity-75 disabled:cursor-default"
                                        style={{ textAlignLast: 'center' }}
                                      >
                                        <option value="" className="text-neutral-400 bg-white font-bold">-</option>
                                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                                          <option key={g} value={g} className="text-black bg-white font-bold">
                                            {g}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Text Input Cell */}
                                    <td className="p-0">
                                      <input
                                        type="text"
                                        disabled={!isEditMode}
                                        value={row.text || ''}
                                        onChange={(e) => updateRowText(category.id, rowIndex, e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white text-black border-0 focus:outline-none focus:bg-neutral-50 focus:ring-1 focus:ring-[#c5a059] placeholder-neutral-300 uppercase transition-all font-sans text-xs tracking-wider font-semibold disabled:opacity-90 disabled:cursor-default"
                                        placeholder={isEditMode ? `Ingresar texto fila ${String(rowIndex + 1).padStart(2, '0')}...` : `Fila vacía`}
                                        id={`row-input-${category.id}-${rowIndex}`}
                                      />
                                    </td>
                                  </tr>
                                ))}

                                {/* 3. Control Row: Button to Add / Delete last row */}
                                {isEditMode && (
                                  <tr className="bg-neutral-50">
                                    <td className="w-12 bg-neutral-200 border-r border-neutral-200"></td>
                                    <td className="p-2" colSpan={2}>
                                      <div className="flex gap-2 justify-center">
                                        <button
                                          onClick={() => addRowToCategory(category.id)}
                                          className="flex-1 py-2 text-[10px] uppercase font-bold tracking-widest border border-black/20 hover:bg-black hover:text-white text-black bg-white transition-all rounded-sm"
                                          title="Añadir una fila"
                                          id={`btn-add-row-${category.id}`}
                                        >
                                          + Añadir Fila
                                        </button>
                                        
                                        <button
                                          onClick={() => removeLastRowFromCategory(category.id)}
                                          disabled={category.rows.length === 0}
                                          className="flex-1 py-2 text-[10px] uppercase font-bold tracking-widest border border-black/20 hover:bg-red-900 hover:text-white text-black bg-white transition-all rounded-sm disabled:opacity-30 disabled:pointer-events-none"
                                          title="Eliminar última fila"
                                          id={`btn-del-row-${category.id}`}
                                        >
                                          - Eliminar Última
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tab2' && (
            <motion.div
              key="tab2-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`w-full mx-auto transition-all duration-300 ${selectedCategoryTab2Id ? 'max-w-none' : 'max-w-4xl'}`}
              id="tab-content-tab2"
            >
              {!selectedCategoryTab2Id ? (
                /* Simple list of categories, white background, black text, thin black border */
                <div className="bg-white text-black p-6 md:p-10 rounded-sm border border-black shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-black uppercase" id="tab2-title">CATEGORÍAS</h2>
                      <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase mt-1">Seleccione una categoría para ver sus grupos y parejas</p>
                    </div>
                    <div className="text-xs font-mono border border-black px-3 py-1 bg-black text-white font-bold rounded-sm uppercase">
                      Total: {categories.length}
                    </div>
                  </div>

                  {categories.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-neutral-300 text-neutral-500 rounded-sm">
                      <p className="text-sm font-bold uppercase tracking-wider">No hay categorías registradas</p>
                      <p className="text-xs mt-1">Cree categorías en la pestaña principal de parejas.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category, index) => {
                        return (
                          <div
                            key={category.id}
                            onClick={() => setSelectedCategoryTab2Id(category.id)}
                            className="border border-black/80 rounded-md py-3 px-4 cursor-pointer hover:bg-neutral-50 hover:border-black transition-all bg-white text-black flex items-center justify-center text-center shadow-sm"
                          >
                            <span className="font-bold text-sm tracking-wider uppercase text-black">
                              {category.name || `CATEGORÍA ${index + 1}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Detail sub-page showing table/planilla of groups and couples for selected category */
                (() => {
                  const selectedCategory = categories.find(c => c.id === selectedCategoryTab2Id);
                  if (!selectedCategory) {
                    setSelectedCategoryTab2Id(null);
                    return null;
                  }

                  // Gather couples from category rows that have BOTH text AND group
                  const activeCouples = selectedCategory.rows
                    .map((r, i) => ({ ...r, originalIndex: i + 1 }))
                    .filter(r => r.text && r.text.trim() !== '' && r.group && r.group.trim() !== '');

                  // Group active couples by group
                  const groupsMap: { [key: string]: typeof activeCouples } = {};
                  activeCouples.forEach(couple => {
                    const g = couple.group.toUpperCase();
                    if (!groupsMap[g]) {
                      groupsMap[g] = [];
                    }
                    groupsMap[g].push(couple);
                  });

                  // Get sorted list of group names
                  const sortedGroupNames = Object.keys(groupsMap).sort();

                  return (
                    <div className="bg-white text-black p-4 md:p-8 md:px-12 xl:px-16 w-full rounded-none border-y border-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] m-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-3 mb-4 gap-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold font-mono">Planilla Detallada por Grupos</span>
                          <h2 className="text-2xl font-black tracking-tight text-black uppercase mt-1">
                            {selectedCategory.name}
                          </h2>
                        </div>
                        <button
                          onClick={() => setSelectedCategoryTab2Id(null)}
                          className="px-4 py-2 border-2 border-black hover:bg-neutral-100 text-black text-xs font-bold uppercase tracking-widest transition-colors rounded-sm inline-flex items-center gap-2"
                        >
                          <span>Volver a Categorías</span>
                        </button>
                      </div>

                      {sortedGroupNames.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-neutral-300 text-neutral-500 rounded-sm">
                          <p className="text-sm font-bold uppercase tracking-wider">No hay parejas con grupo asignado en esta categoría</p>
                          <p className="text-xs mt-1">Ingrese parejas y asígnelas a un grupo (A-L) en la pestaña "PAREJAS" para que aparezcan en esta planilla.</p>
                          <button
                            onClick={() => {
                              setSelectedCategoryTab2Id(null);
                              setActiveTab('parejas');
                            }}
                            className="mt-6 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-neutral-800 transition animate-pulse"
                          >
                            Ir a Registrar Parejas
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                          {/* Left Column: Group Spreadsheets */}
                          <div className="xl:col-span-5 space-y-6">
                            <div className="border-b border-black/15 pb-2 mb-1">
                              <h3 className="text-xs font-mono font-black tracking-widest uppercase text-neutral-500">Planillas de Clasificación</h3>
                            </div>

                            {sortedGroupNames.map((groupName) => {
                              const couplesInGroup = groupsMap[groupName];
                              const numCouples = couplesInGroup.length;
                              const isFourOrMore = numCouples >= 4;

                              const matchCols = isFourOrMore
                                ? [
                                    { key: 'm1vs2' as const, label: '1vs2', width: 'w-[90px]' },
                                    { key: 'm1vs3' as const, label: '3vs4', width: 'w-[90px]' },
                                    { key: 'm2vs3' as const, label: '\u00A0', width: 'w-[90px]' },
                                    { key: 'g1vsP2' as const, label: '\u00A0', width: 'w-[90px]' }
                                  ]
                                : [
                                    { key: 'm1vs2' as const, label: '1vs2', width: 'w-[90px]' },
                                    { key: 'm1vs3' as const, label: '1vs3', width: 'w-[90px]' },
                                    { key: 'm2vs3' as const, label: '2vs3', width: 'w-[90px]' }
                                  ];

                              return (
                                <div key={groupName} className="border border-black rounded-sm overflow-hidden bg-white shadow-sm">
                                  <div className="bg-black text-[#c5a059] px-3 py-1.5 flex justify-between items-center border-b border-black">
                                    <span className="font-mono font-black text-[10px] tracking-widest uppercase">
                                      GRUPO {groupName}
                                    </span>
                                    <span className="text-[8px] font-mono text-neutral-400 font-bold">
                                      PAREJAS: {numCouples}
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto app-spreadsheet-font planilla-60">
                                    <table className="w-full border-collapse border border-black text-left text-[11px] text-black">
                                      <thead>
                                        <tr className="bg-neutral-100 border-b border-black text-black text-center font-bold">
                                          <th className="border border-black p-1 font-black uppercase tracking-wider text-[9px] text-center w-8">Fila</th>
                                          <th className="border border-black p-1 font-black uppercase tracking-wider text-[9px] text-left">Pareja</th>
                                          {matchCols.map((col, idx) => {
                                            const match = col.label.match(/^(\d+)vs(\d+)$/i);
                                            const isClickable = !!match && !!couplesInGroup[parseInt(match[1], 10) - 1] && !!couplesInGroup[parseInt(match[2], 10) - 1];
                                            return (
                                              <th 
                                                key={idx} 
                                                onClick={() => isClickable && isEditMode && handleHeaderClick(col.label, col.key, couplesInGroup, selectedCategory.id)}
                                                className={`border border-black p-1 font-black uppercase tracking-wider text-[9px] text-center ${col.width} ${isClickable && isEditMode ? 'cursor-pointer hover:bg-neutral-200 hover:text-[#c5a059] transition-all select-none' : ''}`}
                                                title={isClickable && isEditMode ? `Click para completar partido ${col.label}` : undefined}
                                              >
                                                {col.label}
                                              </th>
                                            );
                                          })}
                                          <th className="border border-black p-1 font-black uppercase tracking-wider text-[9px] text-center w-[75px]">P. Ganados</th>
                                          <th className="border border-black p-1 font-black uppercase tracking-wider text-[9px] text-center w-[75px]">Dif. Sets</th>
                                          <th className="border border-black p-1 font-black uppercase tracking-wider text-[9px] text-center w-[75px]">Dif. Games</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {couplesInGroup.map((couple, index) => {
                                          const matchKeys = matchCols.map(col => col.key);
                                          const stats = calculateCoupleStats(couple, matchKeys);

                                          return (
                                            <tr key={index} className="border-b last:border-b-0 border-black hover:bg-neutral-50 transition-colors">
                                              {/* Fila */}
                                              <td className="border border-black p-1 text-center font-mono text-[9px] font-bold text-neutral-600">
                                                {index + 1}
                                              </td>
                                              {/* Pareja */}
                                              <td className="border border-black p-1 font-bold uppercase tracking-wide text-[10.5px] text-neutral-900 truncate max-w-[120px]" title={couple.text}>
                                                {couple.text}
                                              </td>
                                              {/* Match Columns */}
                                              {matchCols.map((col, idx) => {
                                                const val = couple[col.key] || '';
                                                const status = getMatchStatus(val);
                                                let cellBg = '';
                                                let inputBgClass = 'bg-transparent text-black';
                                                if (status === 'win') {
                                                  cellBg = 'bg-green-600 text-white';
                                                  inputBgClass = 'bg-green-600 text-white placeholder-white/50';
                                                } else if (status === 'loss') {
                                                  cellBg = 'bg-red-600 text-white';
                                                  inputBgClass = 'bg-red-600 text-white placeholder-white/50';
                                                }

                                                const isFocused = focusedCell?.originalIndex === couple.originalIndex && focusedCell?.colKey === col.key;
                                                const sets = val.trim().split(/\s+/).filter(Boolean);
                                                const hasSets = sets.length > 0;
                                                const textColor = status !== 'none' ? 'text-white' : 'text-neutral-900';

                                                return (
                                                  <td key={idx} className={`border border-black p-0 text-center transition-colors relative min-w-[50px] h-[30px] ${cellBg}`}>
                                                    <input
                                                      type="text"
                                                      disabled={!isEditMode}
                                                      value={val}
                                                      onChange={(e) => updateRowField(selectedCategory.id, couple.originalIndex - 1, col.key, e.target.value)}
                                                      onFocus={() => isEditMode && setFocusedCell({ originalIndex: couple.originalIndex, colKey: col.key })}
                                                      onBlur={() => setFocusedCell(null)}
                                                      placeholder={isFocused ? "-" : ""}
                                                      className={`w-full text-center border-0 focus:outline-none focus:bg-neutral-100/10 font-mono font-bold text-[9px] py-1 transition-colors ${inputBgClass} ${isFocused ? 'relative z-10 opacity-100' : 'absolute inset-0 opacity-0 cursor-text'} ${!isEditMode ? 'cursor-default' : ''}`}
                                                    />
                                                    {!isFocused && (
                                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-0.5">
                                                        {hasSets ? (
                                                          <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 leading-none">
                                                            {sets.map((set, sIdx) => (
                                                              <span key={sIdx} className={`font-mono font-black text-[8px] sm:text-[9px] ${textColor}`}>
                                                                {set}
                                                              </span>
                                                            ))}
                                                          </div>
                                                        ) : (
                                                          <span className={`font-mono text-[9px] ${status !== 'none' ? 'text-white/60 font-bold' : 'text-neutral-400'}`}>-</span>
                                                        )}
                                                      </div>
                                                    )}
                                                  </td>
                                                );
                                              })}
                                              {/* Partidos Ganados */}
                                              <td className="border border-black p-1 text-center font-mono font-black text-[9px] text-neutral-900 bg-neutral-50/50">
                                                {stats.playedAny ? stats.wins : '0'}
                                              </td>
                                              {/* Diferencia de Set */}
                                              <td className="border border-black p-1 text-center font-mono font-black text-[9px] text-neutral-900 bg-neutral-50/50">
                                                {stats.playedAny ? (stats.setsDiff > 0 ? `+${stats.setsDiff}` : stats.setsDiff) : '0'}
                                              </td>
                                              {/* Diferencia de Games */}
                                              <td className="border border-black p-1 text-center font-mono font-black text-[9px] text-neutral-900 bg-neutral-50/50">
                                                {stats.playedAny ? (stats.gamesDiff > 0 ? `+${stats.gamesDiff}` : stats.gamesDiff) : '0'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Right Column: Play Off Bracket Sheet */}
                          <div className="xl:col-span-7 bg-neutral-50 border border-neutral-300 rounded-sm p-4 md:p-5.5 shadow-sm space-y-4">
                            <div className="border-b border-neutral-300 pb-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <h3 className="text-xs font-mono font-black tracking-widest uppercase text-neutral-800">Fase Final - Play Offs</h3>
                              </div>
                              {isEditMode && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAutoFillOctavos(selectedCategory.id)}
                                    className="px-2.5 py-1.5 text-[9px] uppercase font-bold tracking-widest bg-[#c5a059] text-black hover:bg-[#d4b476] transition-all rounded-sm flex items-center gap-1.5 shadow-sm"
                                    title="Autocompletar Octavos de final basándose en las clasificaciones de grupos"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    <span>Autocompletar</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('¿Está seguro de reiniciar todo el cuadro de play offs? Se borrarán todos los nombres y resultados.')) {
                                        setPlayoffs(prev => ({
                                          ...prev,
                                          [selectedCategory.id]: Array(15).fill(null).map(() => ({ p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' }))
                                        }));
                                      }
                                    }}
                                    className="px-2.5 py-1.5 text-[9px] uppercase font-bold tracking-widest bg-white border border-black/20 text-red-600 hover:bg-red-50 transition-all rounded-sm flex items-center gap-1.5 shadow-sm"
                                    title="Reiniciar llaves de playoffs"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Limpiar</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Horizontal scrolling bracket view */}
                            <div className="overflow-x-auto pb-4 relative scrollbar-thin">
                              <div className="relative min-w-[1100px] h-[720px] select-none" style={{ fontFamily: selectedFontFamily }}>
                                
                                {/* Background SVG Drawing bracket connect lines ("corchetes") */}
                                <svg className="absolute inset-0 pointer-events-none animate-fade-in" width="1100" height="720">
                                  {/* 1. Octavos (Matches 0-7) to Cuartos (Matches 8-11) */}
                                  {Array(4).fill(null).map((_, k) => {
                                    const y_top = 43.75 + k * 2 * 87.5;
                                    const y_bottom = 131.25 + k * 2 * 87.5;
                                    const y_mid = 87.5 + k * 175;
                                    return (
                                      <g key={`c1-${k}`}>
                                        {/* Upper connection */}
                                        <path d={`M 208 ${y_top} L 238 ${y_top}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Lower connection */}
                                        <path d={`M 208 ${y_bottom} L 238 ${y_bottom}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Vertical bracket bar */}
                                        <path d={`M 238 ${y_top} L 238 ${y_bottom}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Connection to Cuartos */}
                                        <path d={`M 238 ${y_mid} L 268 ${y_mid}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                      </g>
                                    );
                                  })}

                                  {/* 2. Cuartos (Matches 8-11) to Semifinales (Matches 12-13) */}
                                  {Array(2).fill(null).map((_, k) => {
                                    const y_top = 87.5 + k * 2 * 175;
                                    const y_bottom = 262.5 + k * 2 * 175;
                                    const y_mid = 175 + k * 350;
                                    return (
                                      <g key={`c2-${k}`}>
                                        {/* Upper connection */}
                                        <path d={`M 476 ${y_top} L 506 ${y_top}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Lower connection */}
                                        <path d={`M 476 ${y_bottom} L 506 ${y_bottom}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Vertical bracket bar */}
                                        <path d={`M 506 ${y_top} L 506 ${y_bottom}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                        {/* Connection to Semifinal */}
                                        <path d={`M 506 ${y_mid} L 536 ${y_mid}`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                      </g>
                                    );
                                  })}

                                  {/* 3. Semifinales (Matches 12-13) to Final (Match 14) */}
                                  <g key="c3">
                                    {/* Upper connection */}
                                    <path d={`M 744 175 L 774 175`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                    {/* Lower connection */}
                                    <path d={`M 744 525 L 774 525`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                    {/* Vertical bracket bar */}
                                    <path d={`M 774 175 L 774 525`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                    {/* Connection to Final */}
                                    <path d={`M 774 350 L 804 350`} stroke="#000000" strokeWidth="1.5" fill="none" />
                                  </g>

                                  {/* 4. Final to Champion */}
                                  <g key="c4">
                                    <path d={`M 1012 350 L 1042 350`} stroke="#c5a059" strokeWidth="2" strokeDasharray="3 3" fill="none" />
                                  </g>
                                </svg>

                                {/* Playoff Match cards placed absolutely on top of background canvas */}
                                {(() => {
                                  const list = getCategoryPlayoffs(selectedCategory.id);
                                  
                                  // Helper to render a bracket match card
                                  const renderBracketCard = (mIdx: number, label: string, leftPos: number, topPos: number) => {
                                    const match = list[mIdx] || { p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' };
                                    
                                    let p1SetsWon = 0;
                                    let p2SetsWon = 0;
                                    
                                    const set1Active = match.s1 !== '' && match.s2 !== '';
                                    const set2Active = (match.s3 ?? '') !== '' && (match.s4 ?? '') !== '';
                                    const set3Active = (match.s5 ?? '') !== '' && (match.s6 ?? '') !== '';
                                    
                                    if (set1Active) {
                                      const s1 = parseFloat(match.s1);
                                      const s2 = parseFloat(match.s2);
                                      if (!isNaN(s1) && !isNaN(s2)) {
                                        if (s1 > s2) p1SetsWon++;
                                        else if (s2 > s1) p2SetsWon++;
                                      }
                                    }
                                    if (set2Active) {
                                      const s3 = parseFloat(match.s3 || '');
                                      const s4 = parseFloat(match.s4 || '');
                                      if (!isNaN(s3) && !isNaN(s4)) {
                                        if (s3 > s4) p1SetsWon++;
                                        else if (s4 > s3) p2SetsWon++;
                                      }
                                    }
                                    if (set3Active) {
                                      const s5 = parseFloat(match.s5 || '');
                                      const s6 = parseFloat(match.s6 || '');
                                      if (!isNaN(s5) && !isNaN(s6)) {
                                        if (s5 > s6) p1SetsWon++;
                                        else if (s6 > s5) p2SetsWon++;
                                      }
                                    }

                                    let p1Win = false;
                                    let p2Win = false;
                                    let isCompleted = false;

                                    if (p1SetsWon === 2) {
                                      p1Win = true;
                                      isCompleted = true;
                                    } else if (p2SetsWon === 2) {
                                      p2Win = true;
                                      isCompleted = true;
                                    } else if (set1Active && !set2Active && !set3Active) {
                                      p1Win = p1SetsWon > p2SetsWon;
                                      p2Win = p2SetsWon > p1SetsWon;
                                      isCompleted = p1Win || p2Win;
                                    } else if (set1Active && set2Active && !set3Active) {
                                      if (p1SetsWon === 2) {
                                        p1Win = true;
                                        isCompleted = true;
                                      } else if (p2SetsWon === 2) {
                                        p2Win = true;
                                        isCompleted = true;
                                      } else {
                                        isCompleted = false; // 1-1, not completed
                                      }
                                    } else if (set3Active) {
                                      p1Win = p1SetsWon > p2SetsWon;
                                      p2Win = p2SetsWon > p1SetsWon;
                                      isCompleted = true;
                                    }

                                    const setsToRender: { p1Key: 's1' | 's3' | 's5'; p2Key: 's2' | 's4' | 's6' }[] = [];
                                    if (isEditMode) {
                                      setsToRender.push({ p1Key: 's1', p2Key: 's2' });
                                      setsToRender.push({ p1Key: 's3', p2Key: 's4' });
                                      setsToRender.push({ p1Key: 's5', p2Key: 's6' });
                                    } else {
                                      if (set1Active) setsToRender.push({ p1Key: 's1', p2Key: 's2' });
                                      if (set2Active) setsToRender.push({ p1Key: 's3', p2Key: 's4' });
                                      if (set3Active) setsToRender.push({ p1Key: 's5', p2Key: 's6' });
                                      
                                      if (setsToRender.length === 0) {
                                        setsToRender.push({ p1Key: 's1', p2Key: 's2' });
                                      }
                                    }

                                    const isFinal = mIdx === 14;

                                    return (
                                      <div 
                                        key={mIdx}
                                        style={{ position: 'absolute', left: `${leftPos}px`, top: `${topPos}px`, width: '208px' }}
                                        className={`border border-black rounded-sm shadow-md overflow-hidden text-[10px] z-10 transition-transform duration-150 hover:scale-[1.02] ${isFinal ? 'bg-[#c5a059] text-black border-black' : 'bg-white text-black'}`}
                                      >
                                        {/* Header */}
                                        <div className="bg-black text-[#c5a059] text-[8px] font-mono px-2 py-0.5 font-bold flex justify-between items-center select-none">
                                          <span className="tracking-widest uppercase">{label}</span>
                                          {isCompleted && <span className="text-[7.5px] text-green-400 font-black">✔</span>}
                                        </div>

                                        {/* Participant 1 */}
                                        <div className={`flex border-b border-black/15 items-center h-[26px] ${isFinal ? 'bg-transparent' : 'bg-white'}`}>
                                          <input 
                                            type="text" 
                                            disabled={!isEditMode}
                                            value={match.p1} 
                                            placeholder="Pareja 1" 
                                            className={`flex-1 min-w-0 px-2 py-0.5 text-[7px] font-bold border-0 focus:outline-none bg-transparent uppercase truncate ${p1Win ? (isFinal ? 'text-black font-black underline' : 'text-green-700 font-black') : 'text-neutral-900'} ${isFinal ? 'placeholder-neutral-700' : 'placeholder-neutral-300'} ${!isEditMode ? 'cursor-default' : ''}`}
                                            onChange={(e) => updatePlayoffMatchField(selectedCategory.id, mIdx, 'p1', e.target.value)}
                                            title={match.p1}
                                          />
                                          {setsToRender.map((sk, sIdx) => (
                                            <input 
                                              key={sIdx}
                                              type="text" 
                                              disabled={!isEditMode}
                                              value={match[sk.p1Key] || ''} 
                                              placeholder="-" 
                                              className={`w-7 text-center font-mono font-black text-[10px] border-l border-black/15 py-0.5 focus:outline-none h-full bg-transparent ${p1Win ? (isFinal ? 'text-black font-black' : 'text-green-700 bg-green-50') : 'text-neutral-900'} ${!isEditMode ? 'cursor-default' : ''}`}
                                              onChange={(e) => updatePlayoffMatchField(selectedCategory.id, mIdx, sk.p1Key, e.target.value)}
                                            />
                                          ))}
                                        </div>

                                        {/* Participant 2 */}
                                        <div className={`flex items-center h-[26px] ${isFinal ? 'bg-transparent' : 'bg-white'}`}>
                                          <input 
                                            type="text" 
                                            disabled={!isEditMode}
                                            value={match.p2} 
                                            placeholder="Pareja 2" 
                                            className={`flex-1 min-w-0 px-2 py-0.5 text-[7px] font-bold border-0 focus:outline-none bg-transparent uppercase truncate ${p2Win ? (isFinal ? 'text-black font-black underline' : 'text-green-700 font-black') : 'text-neutral-900'} ${isFinal ? 'placeholder-neutral-700' : 'placeholder-neutral-300'} ${!isEditMode ? 'cursor-default' : ''}`}
                                            onChange={(e) => updatePlayoffMatchField(selectedCategory.id, mIdx, 'p2', e.target.value)}
                                            title={match.p2}
                                          />
                                          {setsToRender.map((sk, sIdx) => (
                                            <input 
                                              key={sIdx}
                                              type="text" 
                                              disabled={!isEditMode}
                                              value={match[sk.p2Key] || ''} 
                                              placeholder="-" 
                                              className={`w-7 text-center font-mono font-black text-[10px] border-l border-black/15 py-0.5 focus:outline-none h-full bg-transparent ${p2Win ? (isFinal ? 'text-black font-black' : 'text-green-700 bg-green-50') : 'text-neutral-900'} ${!isEditMode ? 'cursor-default' : ''}`}
                                              onChange={(e) => updatePlayoffMatchField(selectedCategory.id, mIdx, sk.p2Key, e.target.value)}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  };

                                  return (
                                    <>
                                      {/* Column 1: Octavos (Matches 0-7, left = 0) */}
                                      {renderBracketCard(0, "Octavos 1", 0, 14)}
                                      {renderBracketCard(1, "Octavos 2", 0, 104)}
                                      {renderBracketCard(2, "Octavos 3", 0, 194)}
                                      {renderBracketCard(3, "Octavos 4", 0, 284)}
                                      {renderBracketCard(4, "Octavos 5", 0, 374)}
                                      {renderBracketCard(5, "Octavos 6", 0, 464)}
                                      {renderBracketCard(6, "Octavos 7", 0, 554)}
                                      {renderBracketCard(7, "Octavos 8", 0, 644)}

                                      {/* Column 2: Cuartos (Matches 8-11, left = 268) */}
                                      {renderBracketCard(8, "Cuartos 1", 268, 59)}
                                      {renderBracketCard(9, "Cuartos 2", 268, 239)}
                                      {renderBracketCard(10, "Cuartos 3", 268, 419)}
                                      {renderBracketCard(11, "Cuartos 4", 268, 599)}

                                      {/* Column 3: Semis (Matches 12-13, left = 536) */}
                                      {renderBracketCard(12, "Semifinal 1", 536, 149)}
                                      {renderBracketCard(13, "Semifinal 2", 536, 509)}

                                      {/* Column 4: Final (Match 14, left = 804) */}
                                      {renderBracketCard(14, "Gran Final", 804, 329)}
                                    </>
                                  );
                                })()}

                                 {/* Champion Label box on the far right */}
                                {(() => {
                                  const list = getCategoryPlayoffs(selectedCategory.id);
                                  const finalMatch = list[14] || { p1: '', p2: '', s1: '', s2: '', s3: '', s4: '', s5: '', s6: '' };
                                  
                                  let finalP1SetsWon = 0;
                                  let finalP2SetsWon = 0;
                                  
                                  const fSet1Active = finalMatch.s1 !== '' && finalMatch.s2 !== '';
                                  const fSet2Active = (finalMatch.s3 ?? '') !== '' && (finalMatch.s4 ?? '') !== '';
                                  const fSet3Active = (finalMatch.s5 ?? '') !== '' && (finalMatch.s6 ?? '') !== '';
                                  
                                  if (fSet1Active) {
                                    const s1 = parseFloat(finalMatch.s1);
                                    const s2 = parseFloat(finalMatch.s2);
                                    if (!isNaN(s1) && !isNaN(s2)) {
                                      if (s1 > s2) finalP1SetsWon++;
                                      else if (s2 > s1) finalP2SetsWon++;
                                    }
                                  }
                                  if (fSet2Active) {
                                    const s3 = parseFloat(finalMatch.s3 || '');
                                    const s4 = parseFloat(finalMatch.s4 || '');
                                    if (!isNaN(s3) && !isNaN(s4)) {
                                      if (s3 > s4) finalP1SetsWon++;
                                      else if (s4 > s3) finalP2SetsWon++;
                                    }
                                  }
                                  if (fSet3Active) {
                                    const s5 = parseFloat(finalMatch.s5 || '');
                                    const s6 = parseFloat(finalMatch.s6 || '');
                                    if (!isNaN(s5) && !isNaN(s6)) {
                                      if (s5 > s6) finalP1SetsWon++;
                                      else if (s6 > s5) finalP2SetsWon++;
                                    }
                                  }

                                  let champion = '';
                                  if (finalP1SetsWon === 2) {
                                    champion = finalMatch.p1;
                                  } else if (finalP2SetsWon === 2) {
                                    champion = finalMatch.p2;
                                  } else if (fSet1Active && !fSet2Active && !fSet3Active) {
                                    if (finalP1SetsWon > finalP2SetsWon) champion = finalMatch.p1;
                                    else if (finalP2SetsWon > finalP1SetsWon) champion = finalMatch.p2;
                                  } else if (fSet1Active && fSet2Active && !fSet3Active) {
                                    if (finalP1SetsWon === 2) champion = finalMatch.p1;
                                    else if (finalP2SetsWon === 2) champion = finalMatch.p2;
                                  } else if (fSet3Active) {
                                    if (finalP1SetsWon > finalP2SetsWon) champion = finalMatch.p1;
                                    else if (finalP2SetsWon > finalP1SetsWon) champion = finalMatch.p2;
                                  }

                                  return (
                                    <div 
                                      style={{ position: 'absolute', left: '982px', top: '344px' }}
                                      className="flex flex-col items-center justify-center text-center animate-bounce z-10"
                                    >
                                      <div className="w-9 h-9 bg-[#c5a059] border border-black rounded-full flex items-center justify-center text-black font-bold shadow-md">
                                        🏆
                                      </div>
                                      <span className="text-[7px] font-mono font-black tracking-widest text-[#c5a059] mt-1 bg-black px-1 py-0.5 rounded-sm uppercase">
                                        CAMPEÓN
                                      </span>
                                      {champion ? (
                                        <div className="bg-green-600 text-white font-black text-[9px] uppercase py-0.5 px-1.5 border border-black rounded-sm max-w-[110px] truncate shadow-md mt-1">
                                          {champion}
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-neutral-400 font-bold mt-1">-</span>
                                      )}
                                    </div>
                                  );
                                })()}

                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* Footer Details */}
      <footer className="border-t border-white/5 py-8 text-center text-[10px] text-white/20 uppercase tracking-[0.2em] bg-[#0d0d0d] mt-12 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl w-full mx-auto">
        <span>© 2026 Arquetipo Design</span>
        <span>Protocolo de Registro Automatizado</span>
      </footer>

      {/* Dynamic Pop-up Modal (Cartel) to Add Category */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-sm p-6 shadow-2xl text-white overflow-hidden"
              id="add-category-modal"
            >
              {/* Top design accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#c5a059]"></div>

              <h3 className="text-xl font-light tracking-widest text-white mb-2 uppercase">Nueva Categoría</h3>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-6 font-mono">Consola de Registro de Parejas</p>
              
              <form onSubmit={confirmAddCategory} className="space-y-5">
                <div>
                  <label htmlFor="new-cat-name-input" className="block text-[10px] uppercase tracking-widest text-[#c5a059] font-bold mb-2">
                    Título de la Categoría
                  </label>
                  <input
                    id="new-cat-name-input"
                    type="text"
                    autoFocus
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej. CLASIFICACIÓN A, TORNEO ABIERTO..."
                    className="w-full px-4 py-3 bg-white text-black font-semibold text-sm rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059] uppercase placeholder-neutral-400 tracking-wider font-serif"
                  />
                  <p className="text-[10px] text-white/30 italic mt-1.5">El título se guardará automáticamente en mayúsculas.</p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white/80 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#c5a059] hover:bg-[#d4b476] text-black text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all shadow-md"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {matchModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMatchModalData(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-sm p-6 shadow-2xl text-white overflow-hidden animate-none"
              id="match-score-modal"
            >
              {/* Top design accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#c5a059]"></div>

              <h3 className="text-xl font-light tracking-widest text-white mb-2 uppercase">Completar Partido</h3>
              <p className="text-xs text-[#c5a059] uppercase tracking-wider mb-6 font-mono font-bold">Consola de Resultados</p>

              {/* Match Header VS */}
              <div className="text-center py-4 bg-neutral-900 border border-white/5 rounded-sm mb-6">
                <div className="text-[#c5a059] font-sans font-black text-sm tracking-wide uppercase px-4 truncate">
                  {matchModalData.couple1Label}
                </div>
                <div className="my-2 text-white/40 font-mono font-bold text-xs uppercase tracking-widest">
                  VS
                </div>
                <div className="text-[#c5a059] font-sans font-black text-sm tracking-wide uppercase px-4 truncate">
                  {matchModalData.couple2Label}
                </div>
              </div>

              {/* Sets Inputs */}
              <div className="space-y-4 mb-6">
                {/* SET 1 */}
                <div className="bg-neutral-950 border border-white/5 rounded-sm p-3 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400">SET 1</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s1_p1}
                      onChange={(e) => setS1P1(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                    <span className="text-white/40 font-bold font-mono">-</span>
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s1_p2}
                      onChange={(e) => setS1P2(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                {/* SET 2 */}
                <div className="bg-neutral-950 border border-white/5 rounded-sm p-3 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400">SET 2</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s2_p1}
                      onChange={(e) => setS2P1(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                    <span className="text-white/40 font-bold font-mono">-</span>
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s2_p2}
                      onChange={(e) => setS2P2(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                {/* SET 3 */}
                <div className="bg-neutral-950 border border-white/5 rounded-sm p-3 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400">SET 3</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s3_p1}
                      onChange={(e) => setS3P1(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                    <span className="text-white/40 font-bold font-mono">-</span>
                    <input
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={s3_p2}
                      onChange={(e) => setS3P2(e.target.value)}
                      placeholder="0"
                      className="w-12 h-10 text-center bg-white text-black font-mono font-black text-lg rounded-sm border-0 focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setMatchModalData(null)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white/80 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMatchScore}
                  className="px-6 py-2 bg-[#c5a059] hover:bg-[#d4b476] text-black text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all shadow-md"
                >
                  Aplicar Resultado
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-sm p-6 shadow-2xl text-white overflow-hidden text-center"
              id="export-modal"
            >
              {/* Top design accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#c5a059]"></div>

              <h3 className="text-xl font-light tracking-widest text-white mb-2 uppercase">Sincronización</h3>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-6 font-mono">Google Sheets</p>

              <div className="space-y-4 my-6">
                {/* Export Button */}
                <button
                  onClick={handleExportToSheets}
                  disabled={syncStatus === 'syncing'}
                  className={`w-full py-3 px-4 rounded-sm font-bold text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                    syncStatus === 'syncing'
                      ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#c5a059] hover:bg-[#d4b476] text-black hover:shadow-[#c5a059]/10'
                  }`}
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3.5 w-3.5" />
                      <span>Exportar a Sheets</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white/80 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showNoAccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Invisible double-click zone in the top-left corner of the viewport */}
            <div 
              className="absolute top-0 left-0 w-24 h-24 z-50 cursor-default" 
              onDoubleClick={() => {
                setIsPasswordInputVisible(true);
              }}
              title="Doble clic para revelar campo de contraseña"
            />

            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNoAccessModal(false);
                setIsPasswordInputVisible(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-sm p-6 shadow-2xl text-white overflow-hidden text-center"
              id="no-access-modal"
            >
              {/* Invisible double-click zone in the top-left corner of the modal card itself to be absolutely sure */}
              <div 
                className="absolute top-0 left-0 w-12 h-12 z-50 cursor-default" 
                onDoubleClick={() => {
                  setIsPasswordInputVisible(true);
                }}
              />

              {/* Top design accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>

              <div className="flex justify-center mb-4 mt-2 text-rose-500">
                <Lock className="h-10 w-10 animate-bounce" />
              </div>

              <h3 className="text-lg font-light tracking-widest text-white mb-2 uppercase">MODO LECTURA</h3>
              <p className="text-xs text-rose-400 uppercase tracking-widest mb-6 font-mono font-bold">Sin acceso a realizar cambios</p>

              {isPasswordInputVisible ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (accessPassword === "99999") {
                      setIsEditMode(true);
                      setShowNoAccessModal(false);
                      setIsPasswordInputVisible(false);
                    } else {
                      alert("Contraseña incorrecta.");
                    }
                  }}
                  className="space-y-4 my-6 text-left"
                >
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-widest text-[#c5a059] font-bold font-mono">
                      Contraseña de Administrador
                    </label>
                    <input
                      type="password"
                      required
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      placeholder="Escribe la contraseña..."
                      autoFocus
                      className="w-full px-3 py-2 bg-neutral-900 border border-white/10 text-white font-mono text-xs rounded-sm focus:ring-1 focus:ring-[#c5a059] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[#c5a059] hover:bg-[#d4b476] text-black rounded-sm font-bold text-xs uppercase tracking-widest transition-all duration-200"
                  >
                    Desbloquear
                  </button>
                </form>
              ) : (
                <div className="text-white/60 text-xs font-mono py-4 uppercase leading-relaxed">
                  Solo los administradores autorizados pueden realizar modificaciones en la planilla.
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoAccessModal(false);
                    setIsPasswordInputVisible(false);
                  }}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white/80 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSyncSuccessToast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-neutral-950 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded shadow-2xl flex items-center gap-3"
            >
              <div className="w-4 h-4 bg-emerald-500/15 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                Categorías y resultados cargados correctamente
              </span>
            </motion.div>
          </div>
        )}




      </AnimatePresence>
    </div>
  );

}

const APPS_SCRIPT_CODE = `// ====== CÓDIGO GOOGLE APPS SCRIPT ======
// Copia todo este código y pégalo en tu Editor de Apps Script (Extensiones -> Apps Script)
// Luego haz clic en "Implementar" -> "Nueva implementación" -> Tipo: "Aplicación Web".
// Configura: "Ejecutar como: Yo" y "Quién tiene acceso: Cualquiera".

function doGet(e) {
  try {
    var action = e.parameter.action;
    var spreadsheetId = e.parameter.spreadsheetId;
    
    if (!spreadsheetId) {
      return createJsonResponse({ error: "Falta el parámetro spreadsheetId" });
    }
    
    if (action === 'import') {
      var data = importDataFromSpreadsheet(spreadsheetId);
      return createJsonResponse(data);
    }
    
    return createJsonResponse({ error: "Acción no soportada o inválida: " + action });
  } catch (err) {
    return createJsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var spreadsheetId = postData.spreadsheetId;
    var categories = postData.categories;
    var rawState = postData.rawState;
    
    if (!spreadsheetId) {
      return createJsonResponse({ error: "Falta spreadsheetId en el cuerpo de la solicitud" });
    }
    
    var result = exportDataToSpreadsheet(spreadsheetId, categories, rawState);
    return createJsonResponse({ success: true, message: "Datos exportados correctamente", sheetsAffected: result });
  } catch (err) {
    return createJsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Guarda la información en Google Sheets de forma estructurada y con diseño visual
function exportDataToSpreadsheet(spreadsheetId, categories, rawState) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetsAffected = [];
  
  // Guardamos también una copia del JSON crudo en una hoja oculta para importaciones perfectas
  var rawSheetName = "__raw_data_backup__";
  var rawSheet = ss.getSheetByName(rawSheetName);
  if (!rawSheet) {
    rawSheet = ss.insertSheet(rawSheetName);
    try {
      rawSheet.hideSheet();
    } catch (e) {
      Logger.log("No se pudo ocultar la hoja de respaldo (es la única hoja visible): " + e.toString());
    }
  }
  rawSheet.clear();
  
  var backupData = rawState || categories;
  var jsonStr = JSON.stringify(backupData);
  var chunkSize = 40000;
  var row = 1;
  for (var i = 0; i < jsonStr.length; i += chunkSize) {
    rawSheet.getRange(row, 1).setValue(jsonStr.substring(i, i + chunkSize));
    row++;
  }
  
  // Procesamos cada categoría
  for (var c = 0; c < categories.length; c++) {
    var cat = categories[c];
    if (!cat) continue;
    var sheetName = (cat.name || "CATEGORÍA").toString().toUpperCase();
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      sheet.clear();
      try {
        var maxR = Math.max(1, sheet.getMaxRows());
        var maxC = Math.max(1, sheet.getMaxColumns());
        sheet.getRange(1, 1, maxR, maxC).breakApart();
      } catch (e) {
        Logger.log("Error al romper celdas unificadas en " + sheetName + ": " + e.toString());
      }
    } else {
      sheet = ss.insertSheet(sheetName);
    }
    
    sheetsAffected.push(sheetName);
    try {
      sheet.setHiddenGridlines(false);
    } catch (gridErr) {
      Logger.log("No se pudo configurar la cuadrícula en " + sheetName + ": " + gridErr.toString());
    }
    
    // Formato simple y directo de 9 columnas pedido por el usuario:
    var headers = ["CATEGORIA", "GRUPO", "PAREJA", "1VS2", "1VS3", "2VS3", "ganados", "dif. set", "dif. games"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight("bold")
      .setBackground("#c5a059")
      .setFontColor("#000000")
      .setHorizontalAlignment("center");
    
    var rowsToInsert = [];
    var catNameLower = (cat.name || "").toString().toLowerCase().trim();
    
    // 1. Grupos con resultados y estadísticas (información de las planillas)
    var catGroups = cat.groups || [];
    for (var g = 0; g < catGroups.length; g++) {
      var gr = catGroups[g];
      if (!gr) continue;
      
      var grName = (gr.groupName || gr.name || "").toString().toUpperCase().trim();
      var grCouples = gr.couples || [];
      
      for (var cpIdx = 0; cpIdx < grCouples.length; cpIdx++) {
        var gcp = grCouples[cpIdx];
        if (!gcp) continue;
        
        var coupleName = (gcp.pareja || gcp.text || "").toString().toUpperCase().trim();
        var scoresObj = gcp.scores || {};
        var matchHeaders = gr.matchHeaders || [];
        
        var score1vs2 = "";
        var score1vs3 = "";
        var score2vs3 = "";
        
        if (matchHeaders.indexOf("1vs2") !== -1) score1vs2 = scoresObj["1vs2"] || "";
        if (matchHeaders.indexOf("1vs3") !== -1) score1vs3 = scoresObj["1vs3"] || "";
        if (matchHeaders.indexOf("3vs4") !== -1) score1vs3 = scoresObj["3vs4"] || "";
        if (matchHeaders.indexOf("2vs3") !== -1) score2vs3 = scoresObj["2vs3"] || "";
        
        var wins = gcp.wins !== undefined ? gcp.wins : "";
        var setsDiff = gcp.setsDiff !== undefined ? gcp.setsDiff : "";
        var gamesDiff = gcp.gamesDiff !== undefined ? gcp.gamesDiff : "";
        
        rowsToInsert.push([
          catNameLower,
          grName,
          coupleName,
          score1vs2,
          score1vs3,
          score2vs3,
          wins,
          setsDiff,
          gamesDiff
        ]);
      }
    }
    
    // 2. Playoffs (Fase Eliminatoria)
    var catPlayoffs = cat.playoffs || [];
    for (var p = 0; p < catPlayoffs.length; p++) {
      var pm = catPlayoffs[p];
      if (!pm) continue;
      
      var p1 = (pm.pareja1 || pm.p1 || "").toString().toUpperCase().trim();
      var p2 = (pm.pareja2 || pm.p2 || "").toString().toUpperCase().trim();
      var setVal = (pm.set1 || "").toString().trim(); // resultado del playoff
      var label = (pm.label || "").toString().toLowerCase().trim();
      
      rowsToInsert.push([
        catNameLower,
        label,
        p1,
        p2,
        setVal, // El resultado de los sets va en la columna 1VS3
        "",     // 2VS3
        "",     // ganados
        "",     // dif. set
        ""      // dif. games
      ]);
    }
    
    if (rowsToInsert.length > 0) {
      sheet.getRange(2, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert)
        .setHorizontalAlignment("center");
      sheet.getRange(1, 1, rowsToInsert.length + 1, headers.length).setBorder(true, true, true, true, true, true);
    }
    
    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch (e) {
      Logger.log("No se pudo redimensionar columnas: " + e.toString());
    }
  }
  
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    var sName = allSheets[s].getName();
    if (sName !== rawSheetName && sheetsAffected.indexOf(sName) === -1) {
      try {
        ss.deleteSheet(allSheets[s]);
      } catch (e) {
        Logger.log("No se pudo eliminar la hoja " + sName + ": " + e.toString());
      }
    }
  }
  
  return sheetsAffected;
}

function importDataFromSpreadsheet(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var rawSheetName = "__raw_data_backup__";
  var rawSheet = ss.getSheetByName(rawSheetName);
  
  if (rawSheet) {
    try {
      var jsonStr = "";
      var lastRow = rawSheet.getLastRow();
      for (var r = 1; r <= lastRow; r++) {
        var val = rawSheet.getRange(r, 1).getValue();
        if (val) jsonStr += val;
      }
      if (jsonStr && jsonStr.trim()) {
        return JSON.parse(jsonStr);
      }
    } catch (rawErr) {
      Logger.log("Error leyendo raw backup: " + rawErr.toString());
    }
  }
  
  // Fallback si no está el backup: analizar la planilla plana del usuario
  var sheets = ss.getSheets();
  var categoriesList = [];
  var playoffsMap = {};
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sheetName = sheet.getName();
    
    if (sheetName === rawSheetName || sheetName.indexOf("__") === 0) continue;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    
    var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var couplesList = [];
    var playoffMatchesList = Array(15).fill(null).map(function(_, pIdx) {
      var label = "";
      if (pIdx >= 0 && pIdx <= 7) label = "octavos" + (pIdx + 1);
      else if (pIdx >= 8 && pIdx <= 11) label = "cuartos" + (pIdx - 7);
      else if (pIdx >= 12 && pIdx <= 13) label = "semifinal" + (pIdx - 11);
      else if (pIdx === 14) label = "final";
      return { label: label, pareja1: "", pareja2: "", set1: "", set2: "", set3: "" };
    });
    
    for (var r = 0; r < values.length; r++) {
      var rowVal = values[r];
      var grpVal = rowVal[1] ? rowVal[1].toString().trim().toLowerCase() : "";
      var parejaVal = rowVal[2] ? rowVal[2].toString().trim().toUpperCase() : "";
      
      if (!grpVal) continue;
      
      // Es una fila de Playoff?
      var isPlayoff = grpVal.indexOf("octavos") !== -1 || 
                      grpVal.indexOf("cuartos") !== -1 || 
                      grpVal.indexOf("semifinal") !== -1 || 
                      grpVal.indexOf("final") !== -1;
                      
      if (isPlayoff) {
        var pIdx = -1;
        if (grpVal.indexOf("octavos") !== -1) {
          var num = parseInt(grpVal.replace("octavos", "").trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 8) pIdx = num - 1;
        } else if (grpVal.indexOf("cuartos") !== -1) {
          var num = parseInt(grpVal.replace("cuartos", "").trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 4) pIdx = 8 + (num - 1);
        } else if (grpVal.indexOf("semifinal") !== -1) {
          var num = parseInt(grpVal.replace("semifinal", "").trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 2) pIdx = 12 + (num - 1);
        } else if (grpVal.indexOf("final") !== -1) {
          pIdx = 14;
        }
        
        if (pIdx !== -1) {
          playoffMatchesList[pIdx].pareja1 = parejaVal;
          playoffMatchesList[pIdx].pareja2 = rowVal[3] ? rowVal[3].toString().toUpperCase().trim() : "";
          playoffMatchesList[pIdx].set1 = rowVal[4] ? rowVal[4].toString().trim() : "";
        }
      } else {
        // Es una pareja de grupo
        if (parejaVal) {
          couplesList.push({
            text: parejaVal,
            group: grpVal.toUpperCase(),
            m1vs2: rowVal[3] ? rowVal[3].toString().trim() : "",
            m1vs3: rowVal[4] ? rowVal[4].toString().trim() : "",
            m2vs3: rowVal[5] ? rowVal[5].toString().trim() : "",
            g1vsP2: "",
            wins: rowVal[6] !== "" ? parseFloat(rowVal[6]) : "",
            setsDiff: rowVal[7] !== "" ? parseFloat(rowVal[7]) : "",
            gamesDiff: rowVal[8] !== "" ? parseFloat(rowVal[8]) : ""
          });
        }
      }
    }
    
    categoriesList.push({
      id: "cat_" + sheetName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      name: sheetName.toUpperCase(),
      rows: couplesList
    });
    
    playoffsMap[sheetName] = playoffMatchesList;
  }
  
  return {
    categories: categoriesList,
    playoffs: playoffsMap
  };
}
`;
