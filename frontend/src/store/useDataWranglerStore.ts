import { create } from 'zustand';

export interface ColumnProfile {
  column: string;
  dataType: 'numeric' | 'string' | 'date' | 'boolean';
  totalCount: number;
  validCount: number;
  nullCount: number;
  outlierCount: number;
  mean: number | null;
  std: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  iqr: number | null;
  histogram: Array<{ bucket: string; count: number }>;
}

export interface RecipeStep {
  id: string;
  name: string;
  type: 'filter' | 'outlier' | 'impute' | 'normalize' | 'derive';
  targetColumn: string;
  details: string;
  affectedRows: number;
  enabled: boolean;
}

interface DataWranglerState {
  rawDataset: Record<string, any>[];
  activeDataset: Record<string, any>[];
  columns: string[];
  selectedColumn: string | null;
  datasetName: string;
  recipe: RecipeStep[];
  columnProfiles: Record<string, ColumnProfile>;
  historyPast: Record<string, any>[][];
  historyFuture: Record<string, any>[][];

  // Acciones
  loadDataset: (name: string, data: Record<string, any>[]) => void;
  selectColumn: (col: string | null) => void;
  computeProfiles: (data: Record<string, any>[]) => Record<string, ColumnProfile>;
  
  // Herramientas de saneamiento
  applyOutlierTreatment: (column: string, method: 'iqr' | 'zscore', action: 'clip' | 'remove' | 'median') => void;
  applyImputation: (column: string, strategy: 'median' | 'mean' | 'zero' | 'ffill') => { affected: number };
  applyBatchAutoImpute: () => { affectedRows: number; affectedCols: string[] };
  applyTextNormalization: (column: string, action: 'trim' | 'upper' | 'lower' | 'clean_special') => void;
  applyDerivedColumn: (name: string, formula: 'margin' | 'day_of_week' | 'is_weekend' | 'revenue') => void;
  applyFilter: (column: string, operator: '>' | '<' | '==' | '!=', value: any) => void;
  applySeparateRefunds: () => { affected: number };

  // Pipeline y Capas
  toggleRecipeStep: (stepId: string) => void;
  undo: () => void;
  redo: () => void;
  resetAll: () => void;
}

export function isMissingOrNull(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    return s === '' || s === '<NULL>' || s === 'NULL' || s === 'NAN' || s === 'UNDEFINED';
  }
  if (typeof val === 'number' && isNaN(val)) return true;
  return false;
}

function calculateColumnProfile(column: string, data: Record<string, any>[]): ColumnProfile {
  const totalCount = data.length;
  if (totalCount === 0) {
    return {
      column,
      dataType: 'string',
      totalCount: 0,
      validCount: 0,
      nullCount: 0,
      outlierCount: 0,
      mean: null,
      std: null,
      median: null,
      min: null,
      max: null,
      iqr: null,
      histogram: [],
    };
  }

  let nullCount = 0;
  const values: any[] = [];
  const numericValues: number[] = [];

  for (const row of data) {
    const val = row[column];
    if (isMissingOrNull(val)) {
      nullCount++;
    } else {
      values.push(val);
      const num = Number(val);
      if (!isNaN(num) && typeof val !== 'boolean') {
        numericValues.push(num);
      }
    }
  }

  const isNumeric = numericValues.length > 0 && numericValues.length >= values.length * 0.8;
  const isDate = !isNumeric && values.some(v => typeof v === 'string' && !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/')));
  const isBoolean = values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false');

  const dataType: ColumnProfile['dataType'] = isNumeric ? 'numeric' : isDate ? 'date' : isBoolean ? 'boolean' : 'string';
  const validCount = values.length;

  let mean: number | null = null;
  let std: number | null = null;
  let median: number | null = null;
  let min: number | null = null;
  let max: number | null = null;
  let iqr: number | null = null;
  let outlierCount = 0;
  const histogram: Array<{ bucket: string; count: number }> = [];

  if (isNumeric && numericValues.length > 0) {
    numericValues.sort((a, b) => a - b);
    const sum = numericValues.reduce((acc, v) => acc + v, 0);
    mean = Number((sum / numericValues.length).toFixed(2));

    const sqDiff = numericValues.reduce((acc, v) => acc + Math.pow(v - mean!, 2), 0);
    std = Number(Math.sqrt(sqDiff / numericValues.length).toFixed(2));

    const mid = Math.floor(numericValues.length / 2);
    median = numericValues.length % 2 !== 0 ? numericValues[mid] : (numericValues[mid - 1] + numericValues[mid]) / 2;
    min = numericValues[0];
    max = numericValues[numericValues.length - 1];

    const q1 = numericValues[Math.floor(numericValues.length * 0.25)];
    const q3 = numericValues[Math.floor(numericValues.length * 0.75)];
    iqr = Number((q3 - q1).toFixed(2));

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    outlierCount = numericValues.filter(v => v < lowerBound || v > upperBound).length;

    // Mini histograma (5 bins)
    const range = (max - min) || 1;
    const binSize = range / 5;
    const bins = [0, 0, 0, 0, 0];
    for (const v of numericValues) {
      let bIdx = Math.floor((v - min) / binSize);
      if (bIdx >= 5) bIdx = 4;
      bins[bIdx]++;
    }
    for (let i = 0; i < 5; i++) {
      const bStart = (min + i * binSize).toFixed(0);
      const bEnd = (min + (i + 1) * binSize).toFixed(0);
      histogram.push({ bucket: `${bStart}-${bEnd}`, count: bins[i] });
    }
  }

  return {
    column,
    dataType,
    totalCount,
    validCount,
    nullCount,
    outlierCount,
    mean,
    std,
    median,
    min,
    max,
    iqr,
    histogram,
  };
}

export const useDataWranglerStore = create<DataWranglerState>((set, get) => ({
  rawDataset: [],
  activeDataset: [],
  columns: [],
  selectedColumn: null,
  datasetName: 'Ventas_Recientes',
  recipe: [],
  columnProfiles: {},
  historyPast: [],
  historyFuture: [],

  computeProfiles: (data: Record<string, any>[]) => {
    if (data.length === 0) return {};
    const cols = Object.keys(data[0]);
    const profiles: Record<string, ColumnProfile> = {};
    for (const col of cols) {
      profiles[col] = calculateColumnProfile(col, data);
    }
    return profiles;
  },

  loadDataset: (name: string, data: Record<string, any>[]) => {
    const cols = data.length > 0 ? Object.keys(data[0]) : [];
    const profiles = get().computeProfiles(data);
    set({
      datasetName: name,
      rawDataset: data,
      activeDataset: [...data],
      columns: cols,
      selectedColumn: cols[0] || null,
      recipe: [],
      columnProfiles: profiles,
      historyPast: [],
      historyFuture: [],
    });
  },

  selectColumn: (col: string | null) => {
    set({ selectedColumn: col });
  },

  applyOutlierTreatment: (column: string, method: 'iqr' | 'zscore', action: 'clip' | 'remove' | 'median') => {
    const { activeDataset, historyPast, recipe, computeProfiles } = get();
    const profile = get().columnProfiles[column];
    if (!profile || profile.dataType !== 'numeric' || profile.mean === null || profile.std === null || profile.median === null) return;

    let lowerBound = 0;
    let upperBound = 0;

    if (method === 'iqr' && profile.iqr !== null) {
      const q1 = (profile.median - (profile.iqr / 2));
      const q3 = (profile.median + (profile.iqr / 2));
      lowerBound = q1 - 1.5 * profile.iqr;
      upperBound = q3 + 1.5 * profile.iqr;
    } else {
      lowerBound = profile.mean - 3 * profile.std;
      upperBound = profile.mean + 3 * profile.std;
    }

    let affected = 0;
    let newDataset: Record<string, any>[] = [];

    if (action === 'remove') {
      newDataset = activeDataset.filter(row => {
        const val = Number(row[column]);
        if (!isNaN(val) && (val < lowerBound || val > upperBound)) {
          affected++;
          return false;
        }
        return true;
      });
    } else {
      newDataset = activeDataset.map(row => {
        const val = Number(row[column]);
        if (!isNaN(val)) {
          if (val < lowerBound || val > upperBound) {
            affected++;
            const newVal = action === 'clip' ? (val < lowerBound ? lowerBound : upperBound) : profile.median;
            return { ...row, [column]: Number(newVal?.toFixed(2)) };
          }
        }
        return row;
      });
    }

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Outliers (${method.toUpperCase()}): ${action}`,
      type: 'outlier',
      targetColumn: column,
      details: `${action} límites [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`,
      affectedRows: affected,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });
  },

  applyImputation: (column: string, strategy: 'median' | 'mean' | 'zero' | 'ffill') => {
    const { activeDataset, historyPast, recipe, computeProfiles } = get();
    const profile = get().columnProfiles[column];
    let fillValue: any = 0;

    if (strategy === 'median') fillValue = profile?.median ?? 0;
    else if (strategy === 'mean') fillValue = profile?.mean ?? 0;
    else if (strategy === 'zero') fillValue = 0;

    let affected = 0;
    let lastValid: any = fillValue;

    const newDataset = activeDataset.map(row => {
      const val = row[column];
      if (isMissingOrNull(val)) {
        affected++;
        const replacement = strategy === 'ffill' ? lastValid : fillValue;
        return { ...row, [column]: replacement };
      }
      lastValid = val;
      return row;
    });

    if (affected === 0) {
      return { affected: 0 };
    }

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Imputar Nulos: ${strategy}`,
      type: 'impute',
      targetColumn: column,
      details: `Reemplazo de ${affected} nulos con ${strategy === 'ffill' ? 'valor anterior' : fillValue}`,
      affectedRows: affected,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });

    return { affected };
  },

  applyBatchAutoImpute: () => {
    const { activeDataset, columns, columnProfiles, historyPast, recipe, computeProfiles } = get();
    if (activeDataset.length === 0) return { affectedRows: 0, affectedCols: [] };

    const colsWithNulls: string[] = [];
    for (const col of columns) {
      const p = columnProfiles[col];
      if (p && p.nullCount > 0) {
        colsWithNulls.push(col);
      }
    }

    if (colsWithNulls.length === 0) {
      return { affectedRows: 0, affectedCols: [] };
    }

    let totalCellsFixed = 0;
    const newDataset = activeDataset.map(row => {
      const updatedRow = { ...row };
      for (const col of colsWithNulls) {
        if (isMissingOrNull(updatedRow[col])) {
          totalCellsFixed++;
          const p = columnProfiles[col];
          if (col === 'total' && updatedRow.cantidad !== undefined && updatedRow.precio_unitario !== undefined && !isMissingOrNull(updatedRow.precio_unitario)) {
            updatedRow[col] = Number((Number(updatedRow.cantidad) * Number(updatedRow.precio_unitario)).toFixed(2));
          } else if (p && p.dataType === 'numeric') {
            updatedRow[col] = p.median !== null ? p.median : 0;
          } else {
            updatedRow[col] = 'Sin clasificar';
          }
        }
      }
      return updatedRow;
    });

    // Asegurar que si precio_unitario fue imputado, total también refleje cantidad * precio
    const fixedDataset = newDataset.map(row => {
      if (isMissingOrNull(row.total)) {
        if (row.cantidad && row.precio_unitario) {
          return { ...row, total: Number((Number(row.cantidad) * Number(row.precio_unitario)).toFixed(2)) };
        }
      }
      return row;
    });

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Auto-Imputación Global (${colsWithNulls.length} cols)`,
      type: 'impute',
      targetColumn: colsWithNulls.join(', '),
      details: `${totalCellsFixed} celdas nulas corregidas en [${colsWithNulls.join(', ')}]`,
      affectedRows: totalCellsFixed,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: fixedDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(fixedDataset),
    });

    return { affectedRows: totalCellsFixed, affectedCols: colsWithNulls };
  },

  applyTextNormalization: (column: string, action: 'trim' | 'upper' | 'lower' | 'clean_special') => {
    const { activeDataset, historyPast, recipe, computeProfiles } = get();
    let affected = 0;

    const newDataset = activeDataset.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        let res = val;
        if (action === 'trim') res = val.trim().replace(/\s+/g, ' ');
        else if (action === 'upper') res = val.toUpperCase().trim();
        else if (action === 'lower') res = val.toLowerCase().trim();
        else if (action === 'clean_special') res = val.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

        if (res !== val) affected++;
        return { ...row, [column]: res };
      }
      return row;
    });

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Normalizar Texto: ${action}`,
      type: 'normalize',
      targetColumn: column,
      details: `Transformación ${action} sobre cadenas`,
      affectedRows: affected,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });
  },

  applyDerivedColumn: (name: string, formula: 'margin' | 'day_of_week' | 'is_weekend' | 'revenue') => {
    const { activeDataset, historyPast, recipe, computeProfiles, columns } = get();
    let affected = 0;

    const newDataset = activeDataset.map(row => {
      let derivedVal: any = null;
      if (formula === 'revenue') {
        const q = Number(row.cantidad || 0);
        const p = Number(row.precio_unitario || 0);
        derivedVal = Number((q * p).toFixed(2));
      } else if (formula === 'day_of_week') {
        const d = new Date(row.fecha);
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        derivedVal = isNaN(d.getTime()) ? 'N/A' : days[d.getDay()];
      } else if (formula === 'is_weekend') {
        const d = new Date(row.fecha);
        derivedVal = isNaN(d.getTime()) ? false : (d.getDay() === 0 || d.getDay() === 6);
      } else if (formula === 'margin') {
        const p = Number(row.precio_unitario || 0);
        const c = Number(row.costo_unitario !== undefined ? row.costo_unitario : 0);
        derivedVal = Number((p - c).toFixed(2));
      }
      affected++;
      return { ...row, [name]: derivedVal };
    });

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Métrica Derivada: [${name}]`,
      type: 'derive',
      targetColumn: name,
      details: `Fórmula: ${formula}`,
      affectedRows: affected,
      enabled: true,
    };

    const newCols = columns.includes(name) ? columns : [...columns, name];

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      columns: newCols,
      selectedColumn: name,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });
  },

  applyFilter: (column: string, operator: '>' | '<' | '==' | '!=', value: any) => {
    const { activeDataset, historyPast, recipe, computeProfiles } = get();
    const numVal = Number(value);
    const isNum = !isNaN(numVal);

    const initialLen = activeDataset.length;
    const newDataset = activeDataset.filter(row => {
      const cell = row[column];
      if (isNum) {
        const cNum = Number(cell);
        if (operator === '>') return cNum > numVal;
        if (operator === '<') return cNum < numVal;
        if (operator === '==') return cNum === numVal;
        if (operator === '!=') return cNum !== numVal;
      }
      if (operator === '==') return String(cell) === String(value);
      if (operator === '!=') return String(cell) !== String(value);
      return true;
    });

    const affected = initialLen - newDataset.length;
    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: `Filtro: ${column} ${operator} ${value}`,
      type: 'filter',
      targetColumn: column,
      details: `Removidas ${affected} filas que no cumplen la condición`,
      affectedRows: affected,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });
  },

  applySeparateRefunds: () => {
    const { activeDataset, historyPast, recipe, computeProfiles } = get();
    const initialLen = activeDataset.length;
    const newDataset = activeDataset.filter(row => {
      const cant = Number(row['cantidad']);
      return isNaN(cant) || cant >= 0;
    });

    const affected = initialLen - newDataset.length;
    if (affected === 0) {
      return { affected: 0 };
    }

    const step: RecipeStep = {
      id: `step-${Date.now()}`,
      name: 'Separar Devoluciones (Cantidad < 0)',
      type: 'filter',
      targetColumn: 'cantidad',
      details: `Aisladas ${affected} devoluciones con saldo negativo para no distorsionar el modelo`,
      affectedRows: affected,
      enabled: true,
    };

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: [],
      activeDataset: newDataset,
      recipe: [...recipe, step],
      columnProfiles: computeProfiles(newDataset),
    });

    return { affected };
  },

  toggleRecipeStep: (stepId: string) => {
    // Para steps, permite conmutar la bandera informativa
    const { recipe } = get();
    set({
      recipe: recipe.map(s => s.id === stepId ? { ...s, enabled: !s.enabled } : s)
    });
  },

  undo: () => {
    const { historyPast, historyFuture, activeDataset, computeProfiles } = get();
    if (historyPast.length === 0) return;

    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, historyPast.length - 1);

    set({
      historyPast: newPast,
      historyFuture: [activeDataset, ...historyFuture],
      activeDataset: previous,
      columnProfiles: computeProfiles(previous),
    });
  },

  redo: () => {
    const { historyPast, historyFuture, activeDataset, computeProfiles } = get();
    if (historyFuture.length === 0) return;

    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    set({
      historyPast: [...historyPast, activeDataset],
      historyFuture: newFuture,
      activeDataset: next,
      columnProfiles: computeProfiles(next),
    });
  },

  resetAll: () => {
    const { rawDataset, computeProfiles, columns } = get();
    set({
      activeDataset: [...rawDataset],
      recipe: [],
      historyPast: [],
      historyFuture: [],
      columnProfiles: computeProfiles(rawDataset),
    });
  },
}));
