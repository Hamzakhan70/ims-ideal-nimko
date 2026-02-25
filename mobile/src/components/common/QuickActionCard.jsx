import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';

const QuickActionCard = ({ title, subtitle, onPress, icon = '+' }) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...elevation.card
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }]
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm
  },
  icon: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: 18
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary
  }
});

export default QuickActionCard;
