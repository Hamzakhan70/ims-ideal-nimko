import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/common/ScreenContainer';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';

const LoginScreen = () => {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setFieldError('Email and password are required');
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      scroll
      contentStyle={styles.scrollContent}
      scrollProps={{ keyboardShouldPersistTaps: 'always' }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.container}>
          <View style={styles.brandCard}>
            <Text style={styles.brandTitle}>Ideal Nimko</Text>
            <Text style={styles.brandSubTitle}>Salesman & Shopkeeper Portal</Text>
            <Text style={styles.brandCaption}>Securely manage orders and recoveries from your phone.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubTitle}>Use your existing web credentials</Text>

            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              returnKeyType="next"
            />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              rightSlot={(
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  <Text style={styles.togglePasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              )}
            />

            {(fieldError || authError) ? <Text style={styles.error}>{fieldError || authError}</Text> : null}

            <AppButton title="Login" onPress={handleSubmit} loading={submitting} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1
  },
  keyboardContainer: {
    flex: 1
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg
  },
  brandCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: spacing.xl,
    ...elevation.card
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.surface
  },
  brandSubTitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '600'
  },
  brandCaption: {
    marginTop: spacing.sm,
    color: '#FEF3C7',
    fontSize: 12
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.soft
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary
  },
  formSubTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: 13
  },
  togglePasswordText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md
  }
});

export default LoginScreen;
