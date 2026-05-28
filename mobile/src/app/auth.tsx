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
import { Phone } from 'lucide-react-native';

export default function AuthScreen() {
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cleanPhone = (raw: string) => {
    let digits = raw.replace(/[^0-9]/g, '');
    if (digits.startsWith('00964')) digits = digits.slice(5);
    else if (digits.startsWith('964')) digits = digits.slice(3);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };

  const handleSubmit = async () => {
    setError(null);
    const digits = cleanPhone(phone);
    if (digits.length < 10) {
      setError('أدخل رقم هاتف صحيح');
      return;
    }
    setLoading(true);
    try {
      const fakeEmail = `964${digits}@phone.boxglobal.app`;
      const fakePass = `boxglobal_964${digits}_secure`;

      // Try sign in first
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: fakePass,
      });

      if (signInErr) {
        // If user doesn't exist, create account
        const { error: signUpErr } = await supabase.auth.signUp({
          email: fakeEmail,
          password: fakePass,
          options: { data: { phone: `+964${digits}` } },
        });
        if (signUpErr) throw signUpErr;
      }

      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || cleanPhone(phone).length < 10;

  return (
    <KeyboardAvoidingView
      testID="auth-screen"
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48 }}>

        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            width: 68, height: 68, borderRadius: 20,
            backgroundColor: '#1a3a20', alignItems: 'center', justifyContent: 'center',
          }}>
            <Phone size={30} color="#4ade80" />
          </View>
        </View>

        <Text style={{
          color: '#fff', fontSize: 26, fontWeight: '800',
          letterSpacing: -0.6, marginBottom: 8, textAlign: 'center',
        }}>
          أهلاً بك في Box Global
        </Text>
        <Text style={{ color: '#555', fontSize: 14, marginBottom: 36, textAlign: 'center' }}>
          أدخل رقم هاتفك للمتابعة
        </Text>

        <Text style={{
          color: '#777', fontSize: 12, fontWeight: '600',
          letterSpacing: 1, marginBottom: 8,
        }}>
          رقم الهاتف
        </Text>

        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#1a1a1a', borderRadius: 14,
          borderWidth: 1, borderColor: '#2a2a2a',
          paddingHorizontal: 16, marginBottom: error ? 12 : 28,
        }}>
          <Text style={{ color: '#4ade80', fontSize: 16, fontWeight: '700', marginRight: 10 }}>
            +964
          </Text>
          <View style={{ width: 1, height: 26, backgroundColor: '#333', marginRight: 12 }} />
          <TextInput
            testID="phone-input"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="7XX XXX XXXX"
            placeholderTextColor="#444"
            maxLength={14}
            autoFocus
            style={{
              flex: 1, paddingVertical: 16,
              color: '#fff', fontSize: 18, letterSpacing: 1.5,
            }}
          />
        </View>

        {error ? (
          <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
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
            <Text style={{
              color: isDisabled ? '#2a6a30' : '#000',
              fontSize: 16, fontWeight: '700',
            }}>
              متابعة
            </Text>
          )}
        </Pressable>

        <Text style={{
          color: '#333', fontSize: 11, textAlign: 'center',
          marginTop: 20, lineHeight: 18,
        }}>
          بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
