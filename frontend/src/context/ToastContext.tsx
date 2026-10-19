import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography, touchTarget } from '../theme/theme';
import { IconCheck, IconClose, IconWarning, IconDashboard } from '../components/common/SvgIcons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-30)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -30,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [opacityAnim, translateYAnim]);

  const showToast = useCallback(
    (msg: string, options?: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(msg);
      setType(options?.type || 'info');
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = options?.durationMs ?? 3500;
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [opacityAnim, translateYAnim, hideToast]
  );

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <IconCheck size={18} color={colors.confidenceHigh} />;
      case 'error':
        return <IconClose size={18} color={colors.alertCritical} />;
      case 'warning':
        return <IconWarning size={18} color={colors.alertWarning} />;
      case 'info':
      default:
        return <IconDashboard size={18} color={colors.accentPrimary} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return colors.confidenceHigh;
      case 'error':
        return colors.alertCritical;
      case 'warning':
        return colors.alertWarning;
      case 'info':
      default:
        return colors.accentPrimary;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return colors.confidenceHighBg;
      case 'error':
        return colors.alertCriticalBg;
      case 'warning':
        return colors.alertWarningBg;
      case 'info':
      default:
        return colors.accentPrimaryGlow;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              opacity: opacityAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastCard,
              {
                backgroundColor: colors.surface,
                borderColor: getBorderColor(),
                shadowColor: getBorderColor(),
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: getBgColor(),
                  borderColor: getBorderColor(),
                },
              ]}
            >
              {renderIcon()}
            </View>
            <Text style={[styles.messageText, { color: colors.textPrimary }]}>{message}</Text>
            <IconClose size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    maxWidth: 680,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: touchTarget.minHeight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 22,
  },
  closeHint: {
    fontSize: 14,
    marginLeft: 10,
    padding: 4,
  },
});
