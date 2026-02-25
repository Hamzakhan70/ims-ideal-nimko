import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SectionTitle = ({ children, rightNode }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{children}</Text>
      {rightNode}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary
  }
});

export default SectionTitle;
