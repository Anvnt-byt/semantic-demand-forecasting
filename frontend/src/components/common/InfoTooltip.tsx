import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

interface InfoTooltipProps {
  /** Texto técnico o fórmula matemática formal para desplegar en el popover flotante */
  technicalDescription: string;
  /** Etiqueta opcional para el encabezado del popover (ej. 'Fórmula Estadística' o 'Parámetro ML') */
  technicalTitle?: string;
  /** Tamaño del icono de ayuda */
  size?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  technicalDescription,
  technicalTitle = 'Detalle Técnico & Metodología',
  size = 14,
}) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isWeb = Platform.OS === 'web';
  const showCard = visible || (isWeb && hovered);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setVisible(!visible)}
        // @ts-ignore: React Native Web hover events
        onMouseEnter={() => setHovered(true)}
        // @ts-ignore
        onMouseLeave={() => setHovered(false)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Información técnica"
        style={[
          styles.badge,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: showCard ? colors.accentPrimary : colors.surfaceSecondary,
            borderColor: showCard ? colors.accentPrimary : colors.surfaceBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              fontSize: size - 3,
              color: showCard ? '#FFFFFF' : colors.textMuted,
            },
          ]}
        >
          ?
        </Text>
      </TouchableOpacity>

      {/* Floating Card para Web o Pantallas de Escritorio */}
      {showCard && isWeb && (
        <View
          style={[
            styles.floatingCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentPrimary,
              shadowColor: '#000',
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.cardTitle, { color: colors.accentPrimary }]}>
              {technicalTitle.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            {technicalDescription}
          </Text>
          <View style={styles.footnoteRow}>
            <Text style={[styles.footnote, { color: colors.textMuted }]}>
              Documentación metodológica on-premise
            </Text>
          </View>
        </View>
      )}

      {/* Modal flotante accesible para móvil táctil */}
      {visible && !isWeb && (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accentPrimary,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.accentPrimary, marginBottom: 6 }]}>
                {technicalTitle.toUpperCase()}
              </Text>
              <Text style={[styles.cardBody, { color: colors.textSecondary, marginBottom: 12 }]}>
                {technicalDescription}
              </Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    zIndex: 100,
  },
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: 'bold',
    fontFamily: typography.fontFamilyMono,
    lineHeight: 14,
  },
  floatingCard: {
    position: 'absolute',
    top: 24,
    left: -20,
    width: 290,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  closeBtn: {
    paddingHorizontal: 4,
  },
  cardBody: {
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
  },
  footnoteRow: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  footnote: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
});
