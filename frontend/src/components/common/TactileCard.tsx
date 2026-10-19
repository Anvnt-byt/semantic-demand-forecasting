import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TactileCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  highlight?: boolean;
}

export const TactileCard: React.FC<TactileCardProps> = ({
  children,
  style,
  highlight = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: highlight ? colors.accentPrimary : colors.surfaceBorder,
          shadowColor: isDark ? colors.cardGlow : '#000000',
          shadowOpacity: isDark ? 0.35 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
});
