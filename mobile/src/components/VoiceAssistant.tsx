import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Mic, MicOff, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const DAILY_LIMIT_SECONDS = 5 * 60; // 5 minutes

type PageContext = {
  currentPage: string;
  productInfo?: {
    title?: string;
    price?: string;
    platform?: string;
    rating?: number;
  };
  searchQuery?: string;
  searchResults?: Array<{ title: string; price: string; platform: string }>;
};

type VoiceAssistantProps = {
  context: PageContext;
  onNavigate?: (page: string, params?: Record<string, string>) => void;
  onSearch?: (query: string) => void;
  onNavigateToStore?: (platform: string, query: string) => void;
  variant?: 'fab' | 'bar';
};

export function VoiceAssistant({ context, onNavigate, onSearch, onNavigateToStore, variant = 'fab' }: VoiceAssistantProps) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(DAILY_LIMIT_SECONDS);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch today's usage on mount / user change
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('voice_usage')
      .select('used_seconds')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle()
      .then(({ data }) => {
        const used = data?.used_seconds ?? 0;
        setRemainingSeconds(Math.max(0, DAILY_LIMIT_SECONDS - used));
      });
  }, [user]);

  // Countdown timer while listening
  useEffect(() => {
    if (isListening) {
      sessionStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            stopSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Save usage when session ends
      if (sessionStartRef.current && user) {
        const elapsed = Math.round((Date.now() - sessionStartRef.current) / 1000);
        sessionStartRef.current = null;
        if (elapsed > 0) {
          const today = new Date().toISOString().slice(0, 10);
          supabase.rpc('increment_voice_usage', {
            p_user_id: user.id,
            p_date: today,
            p_seconds: elapsed,
          }).then(() => {});
        }
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Animation values
  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1, false
      );
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1, false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      waveOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.3], [0.5, 0]),
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      console.log('[Voice] Event:', msg.type);

      switch (msg.type) {
        case 'conversation.item.input_audio_transcription.completed':
          setTranscript(msg.transcript || '');
          break;
        case 'response.audio_transcript.delta':
          setAiResponse((prev) => prev + (msg.delta || ''));
          break;
        case 'response.audio_transcript.done':
          break;
        case 'response.function_call_arguments.done':
          handleFunctionCall(msg);
          break;
        case 'response.done':
          setAiResponse('');
          break;
      }
    } catch {
      // ignore
    }
  }, []);

  const handleFunctionCall = useCallback((msg: any) => {
    try {
      const args = JSON.parse(msg.arguments || '{}');
      const fnName = msg.name;

      switch (fnName) {
        case 'search_products':
          if (onSearch && args.query) {
            onSearch(args.query);
          }
          sendFunctionResult(msg.call_id, { success: true, message: `جاري البحث عن: ${args.query}` });
          break;
        case 'navigate_to':
          if (onNavigate) {
            onNavigate(args.page, args.searchQuery ? { query: args.searchQuery } : undefined);
          }
          sendFunctionResult(msg.call_id, { success: true, message: `تم التنقل إلى ${args.page}` });
          break;
        case 'navigate_to_store':
          if (onNavigateToStore && args.platform && args.query) {
            onNavigateToStore(args.platform, args.query);
            // Fetch search results and return them to AI
            fetchSearchResults(args.query, args.platform, msg.call_id, args.minPrice, args.maxPrice);
          } else {
            sendFunctionResult(msg.call_id, { success: true, message: `تم الدخول على ${args.platform}` });
          }
          break;
        case 'calculate_price':
          const priceIQD = Math.round((args.priceUSD || 0) * 1350 * 1.2);
          const shipping = Math.round((args.weightKg || 0.5) * 2.2 * 8900);
          const total = priceIQD + shipping;
          sendFunctionResult(msg.call_id, {
            priceIQD: total.toLocaleString('en', { maximumFractionDigits: 0 }),
            currency: 'دينار عراقي',
            breakdown: { productPrice: priceIQD, shipping },
          });
          break;
        default:
          sendFunctionResult(msg.call_id, { error: 'Unknown function' });
      }
    } catch {
      // ignore
    }
  }, [onSearch, onNavigate, onNavigateToStore]);

  const fetchSearchResults = useCallback(async (query: string, platform: string, callId: string, minPrice?: number, maxPrice?: number) => {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || SUPABASE_URL;
      let url = `${baseUrl}/search?q=${encodeURIComponent(query)}&platforms=${platform}&page=1`;
      if (minPrice) url += `&min_price=${minPrice}`;
      if (maxPrice) url += `&max_price=${maxPrice}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
      });
      if (!res.ok) {
        sendFunctionResult(callId, { success: true, message: `تم الدخول على ${platform} والبحث عن: ${query}. النتائج تظهر على الشاشة.` });
        return;
      }
      const json = await res.json();
      const results = (json?.data?.results ?? []).slice(0, 8);
      const summary = results.map((r: any, i: number) => ({
        rank: i + 1,
        title: r.title || 'بدون عنوان',
        price: r.priceText || r.price || 'غير محدد',
      }));
      sendFunctionResult(callId, {
        success: true,
        platform,
        query,
        totalResults: summary.length,
        results: summary,
      });
    } catch {
      sendFunctionResult(callId, { success: true, message: `تم الدخول على ${platform} والبحث عن: ${query}` });
    }
  }, []);

  const sendFunctionResult = useCallback((callId: string, result: any) => {
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      }));
      dc.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  const startSession = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setError('المساعد الصوتي متاح حالياً على المتصفح فقط');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check daily limit
    if (remainingSeconds <= 0) {
      setError('انتهى وقتك اليومي (5 دقائق). حاول مرة أخرى غداً');
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (!user) {
      setError('سجّل دخولك لاستخدام المساعد الصوتي');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript('');
    setAiResponse('');

    try {
      // 1. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Add audio track to peer connection
      stream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote audio (AI response)
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        // Send session.update with tools via data channel (cheaper than embedding in SDP)
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            tools: [
              {
                type: 'function', name: 'search_products',
                description: 'البحث عن منتجات',
                parameters: { type: 'object', properties: { query: { type: 'string' }, platform: { type: 'string', enum: ['amazon','ebay','walmart','taobao','1688','iherb'] } }, required: ['query'] },
              },
              {
                type: 'function', name: 'navigate_to_store',
                description: 'الدخول على متجر والبحث فيه',
                parameters: { type: 'object', properties: { platform: { type: 'string', enum: ['amazon','ebay','walmart','taobao','1688','iherb'] }, query: { type: 'string' } }, required: ['platform','query'] },
              },
              {
                type: 'function', name: 'navigate_to',
                description: 'التنقل إلى صفحة',
                parameters: { type: 'object', properties: { page: { type: 'string', enum: ['home','search','cart','orders'] }, searchQuery: { type: 'string' } }, required: ['page'] },
              },
              {
                type: 'function', name: 'calculate_price',
                description: 'حساب السعر بالدينار العراقي',
                parameters: { type: 'object', properties: { priceUSD: { type: 'number' }, weightKg: { type: 'number' } }, required: ['priceUSD'] },
              },
            ],
            tool_choice: 'auto',
          },
        }));

        setIsListening(true);
        setIsConnecting(false);
      };

      dc.onmessage = handleDataChannelMessage;

      // 3. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
        }
      });

      const sdpOffer = pc.localDescription!.sdp;

      // 4. Send SDP to backend (unified interface)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/realtime-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...context, sdp: sdpOffer }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();

      if (!data.sdp) {
        throw new Error('لم يتم الحصول على SDP من السيرفر');
      }

      // 5. Set remote description (SDP answer)
      await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });

    } catch (err: any) {
      console.error('[Voice] Error:', err);
      setError(err.message || 'فشل الاتصال بالمساعد الصوتي');
      setIsConnecting(false);
      stopSession();
    }
  }, [context, handleDataChannelMessage]);

  const stopSession = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    setIsListening(false);
    setIsConnecting(false);
    setTranscript('');
    setAiResponse('');
  }, []);

  const toggleSession = useCallback(() => {
    buttonScale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );

    if (isListening) {
      stopSession();
    } else {
      startSession();
    }
  }, [isListening, startSession, stopSession]);

  if (variant === 'bar') {
    return (
      <View>
        {/* Bar-style voice assistant */}
        <Pressable
          onPress={toggleSession}
          disabled={isConnecting}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: isListening ? '#1a1a1a' : '#f5f5f5',
            borderRadius: 16, borderWidth: 1,
            borderColor: isListening ? '#E52222' : '#e5e5e5',
            paddingHorizontal: 16, height: 52, gap: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: isListening ? '#E52222' : '#E52222',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {isConnecting ? (
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>...</Text>
            ) : isListening ? (
              <MicOff size={18} color="#fff" />
            ) : (
              <Mic size={18} color="#fff" />
            )}
          </View>
          <Text style={{
            flex: 1, fontSize: 15, fontWeight: '500',
            color: isListening ? '#fff' : remainingSeconds <= 0 ? '#cc0000' : '#aaaaaa',
          }} numberOfLines={1}>
            {isConnecting ? 'جاري الاتصال...'
              : isListening ? (transcript || aiResponse || 'أتكلم... اضغط للإيقاف')
              : remainingSeconds <= 0 ? 'انتهى وقتك اليومي، حاول غداً'
              : 'اضغط للتحدث مع المساعد الصوتي...'}
          </Text>
          {isListening ? (
            <View style={{
              backgroundColor: 'rgba(229,34,34,0.2)', borderRadius: 8,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: '#E52222', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {`${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`}
              </Text>
            </View>
          ) : remainingSeconds < DAILY_LIMIT_SECONDS ? (
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600' }}>
              {`${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`}
            </Text>
          ) : null}
        </Pressable>

        {/* Error message for bar variant */}
        {error && (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 6 }}>
            <Text style={{ fontSize: 11, color: '#DC2626', textAlign: 'right' }}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Transcript & Response overlay */}
      {(transcript || aiResponse) && isListening && (
        <View style={styles.transcriptContainer}>
          {transcript ? (
            <Text style={styles.transcriptText}>🎤 {transcript}</Text>
          ) : null}
          {aiResponse ? (
            <Text style={styles.responseText}>🤖 {aiResponse}</Text>
          ) : null}
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Pulse rings */}
      {isListening && (
        <>
          <Animated.View style={[styles.pulseRing, styles.pulseRing1, pulseStyle]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing2, pulseStyle, { transform: [{ scale: 1.1 }] }]} />
        </>
      )}

      {/* Main button */}
      <Animated.View style={buttonAnimStyle}>
        <Pressable
          onPress={toggleSession}
          style={[
            styles.button,
            isListening && styles.buttonActive,
            isConnecting && styles.buttonConnecting,
          ]}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Text style={styles.connectingText}>...</Text>
          ) : isListening ? (
            <MicOff size={22} color="#fff" />
          ) : (
            <Mic size={22} color="#fff" />
          )}
        </Pressable>
      </Animated.View>

      {/* Label */}
      {!isListening && !isConnecting && (
        <Text style={styles.label}>مساعد صوتي</Text>
      )}
      {isListening && (
        <Animated.View style={waveStyle}>
          <Text style={styles.listeningLabel}>أتكلم... </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 998,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E52222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E52222',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: '#333',
  },
  buttonConnecting: {
    backgroundColor: '#999',
  },
  connectingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  listeningLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#E52222',
    fontWeight: '700',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E52222',
  },
  pulseRing1: {
    top: 0,
  },
  pulseRing2: {
    top: 0,
  },
  transcriptContainer: {
    position: 'absolute',
    bottom: 80,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 6,
  },
  transcriptText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  responseText: {
    fontSize: 12,
    color: '#E52222',
    textAlign: 'right',
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    right: 0,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    width: 200,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    textAlign: 'right',
  },
});
