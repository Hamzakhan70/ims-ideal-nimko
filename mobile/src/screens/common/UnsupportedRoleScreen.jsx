import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import AppButton from '../../components/common/AppButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const UnsupportedRoleScreen = () => {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Mobile Access Not Enabled</Text>
        <Text style={styles.subtitle}>
          Current role: {user?.role || '-'}.
        </Text>
        <Text style={styles.subtitle}>
          This mobile app currently supports salesman and shopkeeper only.
        </Text>
        <View style={styles.buttonWrap}>
          <AppButton title="Logout" onPress={logout} variant="secondary" />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxl
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  buttonWrap: {
    marginTop: spacing.xl
  }
});

export default UnsupportedRoleScreen;
