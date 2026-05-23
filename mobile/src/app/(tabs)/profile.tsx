import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, User, Mail } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="profile-screen"
      style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top + 12 }}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ color: '#1a1a1a', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 }}>
          حسابي
        </Text>
      </View>

      {user ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {/* Avatar */}
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#f5f5f5',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#E52222',
                marginBottom: 12,
              }}
            >
              <User size={36} color="#E52222" strokeWidth={1.5} />
            </View>
            <Text style={{ color: '#1a1a1a', fontSize: 16, fontWeight: '700' }}>{user.email}</Text>
            <Text style={{ color: '#999999', fontSize: 12, marginTop: 4 }}>عضو في Box Global</Text>
          </View>

          {/* Email row */}
          <View
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: '#e5e5e5',
            }}
          >
            <Mail size={18} color="#999999" />
            <Text style={{ color: '#555555', fontSize: 14, flex: 1 }}>{user.email}</Text>
          </View>

          {/* Sign out */}
          <Pressable
            testID="sign-out-button"
            onPress={async () => {
              await signOut();
            }}
            style={({ pressed }) => ({
              backgroundColor: '#fff5f5',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: '#fde8e8',
              opacity: pressed ? 0.7 : 1,
              marginTop: 8,
            })}
          >
            <LogOut size={18} color="#f87171" />
            <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '600' }}>
              تسجيل الخروج
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: '#f5f5f5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#e5e5e5',
            }}
          >
            <User size={32} color="#cccccc" strokeWidth={1.5} />
          </View>
          <Text style={{ color: '#1a1a1a', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            مرحباً بك
          </Text>
          <Text
            style={{
              color: '#999999',
              fontSize: 14,
              textAlign: 'center',
              paddingHorizontal: 40,
              marginBottom: 24,
            }}
          >
            سجّل دخولك للوصول إلى حسابك ومفضلاتك
          </Text>
          <Pressable
            testID="sign-in-button"
            onPress={() => router.push('/auth')}
            style={({ pressed }) => ({
              backgroundColor: '#E52222',
              borderRadius: 14,
              paddingHorizontal: 32,
              paddingVertical: 14,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>
              تسجيل الدخول / إنشاء حساب
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
