import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';

const StatCard = ({ title, value, compact = false, tone = 'default' }) => {
  const cardToneStyle = tone === 'success'
    ? styles.successCard
    : tone === 'warning'
      ? styles.warningCard
      : tone === 'info'
        ? styles.infoCard
        : styles.defaultCard;

  return (
    <View style={[styles.card, compact && styles.compactCard, cardToneStyle]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    ...elevation.soft
  },
  compactCard: {
    width: '31%'
  },
  defaultCard: {
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  successCard: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4'
  },
  warningCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB'
  },
  infoCard: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF'
  },
  title: {
    color: colors.textTertiary,
    fontSize: 12
  },
  value: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    marginTop: spacing.xs
  }
});

export default StatCard;
