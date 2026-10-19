import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/theme';

export interface BannerMessage {
  type: 'rate_limit' | 'forbidden' | 'network' | 'error' | 'success';
  message: string;
  retryCountdown?: number;
  onRetry?: () => void;
}

interface ErrorBannerProps {
  banner: BannerMessage | null;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ banner, onDismiss }) => {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (banner?.retryCountdown && banner.retryCountdown > 0) {
      setCountdown(banner.retryCountdown);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            banner.onRetry?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [banner]);

  if (!banner) return null;

  const isRateLimit = banner.type === 'rate_limit';
  const isForbidden = banner.type === 'forbidden';
  const isNetwork = banner.type === 'network';

  const getColors = () => {
    if (isRateLimit) {
      return {
        bg: colors.alertWarningBg,
        border: colors.alertWarning,
        text: colors.alertWarning,
      };
    }
    if (isForbidden) {
      return {
        bg: colors.alertCriticalBg,
        border: colors.alertCritical,
        text: colors.alertCritical,
      };
    }
    if (banner.type === 'success') {
      return {
        bg: colors.confidenceHighBg,
        border: colors.confidenceHigh,
        text: colors.confidenceHigh,
      };
    }
    return {
      bg: colors.alertCriticalBg,
      border: colors.alertCritical,
      text: colors.alertCritical,
    };
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
    >
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: scheme.text }]}>
          {isRateLimit
            ? '[429] LIMITE DE TASA HTTP'
            : isForbidden
            ? '[403] ACCESO DENEGADO HTTP'
            : isNetwork
            ? '[RED] ERROR DE CONEXION LAN'
            : 'ADVERTENCIA'}
        </Text>
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          {isRateLimit && countdown > 0
            ? `Límite de solicitudes alcanzado. Reintentando automáticamente en ${countdown} segundos...`
            : banner.message}
        </Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={[styles.dismissText, { color: colors.textMuted }]}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    borderWidth: 1.2,
    padding: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: typography.fontFamilyMono,
  },
  message: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
  },
  dismissButton: {
    padding: 6,
  },
  dismissText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
