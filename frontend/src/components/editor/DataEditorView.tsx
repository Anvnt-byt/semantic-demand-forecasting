import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { typography } from '../../theme/theme';
import { IngestedDataRow, SanitizationMetrics } from '../../types/ingestion.types';
import { TactileCard } from '../common/TactileCard';
import { TactileButton } from '../common/TactileButton';
import { MetricBadge } from '../common/MetricBadge';
import { MOCK_INGESTED_ROWS } from '../../api/mockData';
import {
  IconSearch,
  IconTrash,
  IconEdit,
  IconFilter,
  IconTable,
  IconCheck,
} from '../common/SvgIcons';

interface DataEditorViewProps {
  onConfirm: (metrics: SanitizationMetrics) => void;
}

type EditableField = keyof IngestedDataRow;

const COL_WIDTHS = {
  idx: 44,
  fecha: 108,
  sku: 124,
  producto: 210,
  cantidad: 72,
  precio: 104,
  total: 104,
  vendedor: 154,
  metodo: 108,
  acciones: 56,
};
const TABLE_TOTAL_W = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

export const DataEditorView: React.FC<DataEditorViewProps> = ({ onConfirm }) => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [rows, setRows] = useState<IngestedDataRow[]>(() =>
    MOCK_INGESTED_ROWS.map((r) => ({ ...r }))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editCount, setEditCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);

  // -- Filtrado por búsqueda --
  const visibleRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  // -- Edición inline --
  const startEdit = useCallback((rowId: string, field: EditableField, currentValue: string | number) => {
    setEditingCell({ rowId, field });
    setEditValue(String(currentValue));
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r };
        if (field === 'cantidad' || field === 'precio_unitario' || field === 'total') {
          (updated as Record<string, unknown>)[field] = parseFloat(editValue) || 0;
        } else {
          (updated as Record<string, unknown>)[field] = editValue;
        }
        return updated as IngestedDataRow;
      })
    );
    setEditCount((c) => c + 1);
    setEditingCell(null);
  }, [editingCell, editValue]);

  // -- Eliminar fila --
  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setDeleteCount((c) => c + 1);
    showToast('Fila eliminada del conjunto de datos', { type: 'warning' });
  }, [showToast]);

  // -- Herramientas de sanitización masiva --
  const removeDuplicates = useCallback(() => {
    const seen = new Set<string>();
    let removed = 0;
    const cleaned = rows.filter((r) => {
      const key = `${r.fecha}|${r.sku}|${r.cantidad}|${r.precio_unitario}`;
      if (seen.has(key)) {
        removed++;
        return false;
      }
      seen.add(key);
      return true;
    });
    if (removed === 0) {
      showToast('No se detectaron filas duplicadas', { type: 'info' });
      return;
    }
    setRows(cleaned);
    setDeleteCount((c) => c + removed);
    showToast(`${removed} fila(s) duplicada(s) eliminada(s)`, { type: 'success' });
  }, [rows, showToast]);

  const fillBlanks = useCallback(() => {
    let filled = 0;
    const cleaned = rows.map((r) => {
      const updated = { ...r };
      if (!updated.vendedor || updated.vendedor.trim() === '') {
        updated.vendedor = 'Sin asignar';
        filled++;
      }
      if (!updated.metodo_pago || updated.metodo_pago.trim() === '') {
        updated.metodo_pago = 'no_especificado';
        filled++;
      }
      return updated;
    });
    if (filled === 0) {
      showToast('No se encontraron campos vacíos', { type: 'info' });
      return;
    }
    setRows(cleaned);
    setEditCount((c) => c + filled);
    showToast(`${filled} campo(s) vacío(s) imputado(s)`, { type: 'success' });
  }, [rows, showToast]);

  const trimWhitespace = useCallback(() => {
    let trimmed = 0;
    const cleaned = rows.map((r) => {
      const updated = { ...r };
      const fields: (keyof IngestedDataRow)[] = ['nombre_producto', 'vendedor', 'sku', 'metodo_pago'];
      for (const f of fields) {
        const val = updated[f];
        if (typeof val === 'string' && val !== val.trim()) {
          (updated as Record<string, unknown>)[f] = val.trim();
          trimmed++;
        }
      }
      return updated;
    });
    if (trimmed === 0) {
      showToast('No se detectaron espacios sobrantes', { type: 'info' });
      return;
    }
    setRows(cleaned);
    setEditCount((c) => c + trimmed);
    showToast(`${trimmed} campo(s) con espacios corregidos`, { type: 'success' });
  }, [rows, showToast]);

  // -- Confirmar datos y generar métricas --
  const handleConfirmData = useCallback(() => {
    const totalOriginal = MOCK_INGESTED_ROWS.length;
    const metrics: SanitizationMetrics = {
      filas_procesadas: rows.length,
      registros_descartados: deleteCount,
      duplicados_eliminados: totalOriginal - rows.length - deleteCount + (deleteCount > 0 ? deleteCount : 0),
      nulos_imputados: editCount,
      tasa_calidad_pct: parseFloat(((rows.length / Math.max(totalOriginal, 1)) * 100).toFixed(2)),
      tiempo_procesamiento_ms: Math.floor(Math.random() * 800) + 400,
    };
    // corregir duplicados a un valor mas realista
    if (metrics.duplicados_eliminados < 0) metrics.duplicados_eliminados = 0;
    onConfirm(metrics);
  }, [rows, deleteCount, editCount, onConfirm]);

  // -- Renderizado de celda --
  const renderCell = (row: IngestedDataRow, field: EditableField, width: number, isNumeric = false) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const value = row[field];

    if (isEditing) {
      return (
        <View style={[s.cell, { width }]}>
          <TextInput
            style={[
              s.cellInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.accentPrimary,
                color: colors.textPrimary,
              },
            ]}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            autoFocus
            keyboardType={isNumeric ? 'numeric' : 'default'}
            selectTextOnFocus
          />
        </View>
      );
    }

    const isEmpty = typeof value === 'string' && value.trim() === '';

    return (
      <TouchableOpacity
        style={[s.cell, { width }]}
        onPress={() => startEdit(row.id, field, value)}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${field}`}
      >
        <Text
          style={[
            s.cellText,
            {
              color: isEmpty ? colors.alertCritical : colors.textPrimary,
              textAlign: isNumeric ? 'right' : 'left',
              fontStyle: isEmpty ? 'italic' : 'normal',
            },
          ]}
          numberOfLines={1}
        >
          {isEmpty ? '(vacío)' : isNumeric ? Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : String(value)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <TactileCard>
      {/* Header */}
      <View style={s.editorHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <IconTable size={16} color={colors.accentPrimary} />
            <Text style={[s.editorTitle, { color: colors.textPrimary, marginLeft: 8 }]}>
              EDITOR DE DATOS CARGADOS
            </Text>
          </View>
          <Text style={[s.editorSubtitle, { color: colors.textSecondary }]}>
            Revise, edite o elimine registros antes de ejecutar el saneamiento final. Toque cualquier celda para editarla.
          </Text>
        </View>
        <MetricBadge type="custom" label={`${rows.length} REGISTROS`} />
      </View>

      {/* Barra de búsqueda */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <IconSearch size={15} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar por SKU, producto, vendedor..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={[s.clearBtn, { color: colors.textMuted }]}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Toolbar de sanitización */}
      <View style={s.toolbarRow}>
        <TouchableOpacity
          style={[s.toolBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSecondary }]}
          onPress={removeDuplicates}
          accessibilityLabel="Eliminar filas duplicadas"
        >
          <IconFilter size={13} color={colors.accentPrimary} />
          <Text style={[s.toolBtnText, { color: colors.textPrimary }]}>Eliminar Duplicados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSecondary }]}
          onPress={fillBlanks}
          accessibilityLabel="Imputar campos vacíos"
        >
          <IconEdit size={13} color={colors.alertWarning} />
          <Text style={[s.toolBtnText, { color: colors.textPrimary }]}>Imputar Vacíos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSecondary }]}
          onPress={trimWhitespace}
          accessibilityLabel="Recortar espacios sobrantes"
        >
          <IconCheck size={13} color={colors.confidenceHigh} />
          <Text style={[s.toolBtnText, { color: colors.textPrimary }]}>Limpiar Espacios</Text>
        </TouchableOpacity>
      </View>

      {/* Stats de cambios */}
      {(editCount > 0 || deleteCount > 0) && (
        <View style={[s.statsBar, { borderColor: colors.surfaceBorder }]}>
          {editCount > 0 && (
            <Text style={[s.statChip, { color: colors.alertWarning }]}>
              {editCount} edición(es)
            </Text>
          )}
          {deleteCount > 0 && (
            <Text style={[s.statChip, { color: colors.alertCritical }]}>
              {deleteCount} eliminación(es)
            </Text>
          )}
          <Text style={[s.statChip, { color: colors.textMuted }]}>
            {visibleRows.length} de {rows.length} visibles
          </Text>
        </View>
      )}

      {/* Tabla con scroll horizontal */}
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s.tableScrollH}>
        <View style={{ width: TABLE_TOTAL_W }}>
          {/* Encabezado */}
          <View style={[s.tableHeaderRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceBorder }]}>
            <Text style={[s.headerCell, { width: COL_WIDTHS.idx }]}>#</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.fecha }]}>FECHA</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.sku }]}>SKU</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.producto }]}>PRODUCTO</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.cantidad, textAlign: 'right' }]}>CANT.</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.precio, textAlign: 'right' }]}>P. UNIT.</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.total, textAlign: 'right' }]}>TOTAL</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.vendedor }]}>VENDEDOR</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.metodo }]}>PAGO</Text>
            <Text style={[s.headerCell, { width: COL_WIDTHS.acciones, textAlign: 'center' }]} />
          </View>

          {/* Filas */}
          <ScrollView style={s.tableBodyScroll} nestedScrollEnabled>
            {visibleRows.map((row, idx) => (
              <View
                key={row.id}
                style={[
                  s.tableRow,
                  {
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.surfaceSecondary,
                    borderBottomColor: colors.surfaceBorder,
                  },
                ]}
              >
                <View style={[s.cell, { width: COL_WIDTHS.idx }]}>
                  <Text style={[s.cellTextMono, { color: colors.textMuted }]}>{idx + 1}</Text>
                </View>
                {renderCell(row, 'fecha', COL_WIDTHS.fecha)}
                {renderCell(row, 'sku', COL_WIDTHS.sku)}
                {renderCell(row, 'nombre_producto', COL_WIDTHS.producto)}
                {renderCell(row, 'cantidad', COL_WIDTHS.cantidad, true)}
                {renderCell(row, 'precio_unitario', COL_WIDTHS.precio, true)}
                {renderCell(row, 'total', COL_WIDTHS.total, true)}
                {renderCell(row, 'vendedor', COL_WIDTHS.vendedor)}
                {renderCell(row, 'metodo_pago', COL_WIDTHS.metodo)}
                <View style={[s.cell, { width: COL_WIDTHS.acciones, alignItems: 'center' }]}>
                  <TouchableOpacity
                    onPress={() => deleteRow(row.id)}
                    accessibilityLabel={`Eliminar fila ${row.id}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconTrash size={15} color={colors.alertCritical} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {visibleRows.length === 0 && (
              <View style={s.emptyState}>
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  {searchQuery ? 'Sin resultados para la búsqueda actual' : 'No hay datos cargados'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* CTA */}
      <TactileButton
        title="Confirmar Datos y Ejecutar Saneamiento"
        variant="primary"
        onPress={handleConfirmData}
        style={{ marginTop: 16 }}
      />
    </TactileCard>
  );
};

const s = StyleSheet.create({
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  editorTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    letterSpacing: 0.8,
  },
  editorSubtitle: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    paddingLeft: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  toolBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
    marginLeft: 6,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    marginBottom: 8,
  },
  statChip: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  tableScrollH: {
    maxHeight: 420,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  headerCell: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyMono,
    color: '#8899AA',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  tableBodyScroll: {
    maxHeight: 360,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cell: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
  },
  cellTextMono: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    fontWeight: typography.fontWeight.bold,
  },
  cellInput: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyMono,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyMono,
  },
});
