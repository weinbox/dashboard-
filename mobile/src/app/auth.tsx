import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !email || !password;

  return (
    <KeyboardAvoidingView
      testID="auth-screen"
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
        <Text
          style={{
            color: '#fff',
            fontSize: 24,
            fontWeight: '800',
            letterSpacing: -0.6,
            marginBottom: 8,
          }}
        >
          {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
        </Text>
        <Text style={{ color: '#555', fontSize: 14, marginBottom: 32 }}>
          {mode === 'signin' ? 'ادخل بياناتك للمتابعة' : 'أنشئ حساباً جديداً'}
        </Text>

        <Text
          style={{
            color: '#777',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          البريد الإلكتروني
        </Text>
        <TextInput
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="example@email.com"
          placeholderTextColor="#333"
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#2a2a2a',
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: '#fff',
            fontSize: 15,
            marginBottom: 16,
          }}
        />

        <Text
          style={{
            color: '#777',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          كلمة المرور
        </Text>
        <TextInput
          testID="password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#333"
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#2a2a2a',
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: '#fff',
            fontSize: 15,
            marginBottom: error ? 12 : 24,
          }}
        />

        {error ? (
          <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</Text>
        ) : null}

        <Pressable
          testID="submit-button"
          onPress={handleSubmit}
          disabled={isDisabled}
          style={({ pressed }) => ({
            backgroundColor: isDisabled ? '#1a3a20' : '#4ade80',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text
              style={{
                color: isDisabled ? '#2a6a30' : '#000',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              {mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
          }}
          style={{ marginTop: 20, alignItems: 'center' }}
        >
          <Text style={{ color: '#555', fontSize: 14 }}>
            {mode === 'signin' ? 'ليس لديك حساب؟ ' : 'لديك حساب؟ '}
            <Text style={{ color: '#4ade80', fontWeight: '700' }}>
              {mode === 'signin' ? 'أنشئ حساباً' : 'سجّل الدخول'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
