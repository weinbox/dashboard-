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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type PageContext = {
  currentPage: string;
  productInfo?: {
    title?: string;
    price?: string;
    platform?: string;
    rating?: number;
  };
  searchQuery?: string;
};

type VoiceAssistantProps = {
  context: PageContext;
  onNavigate?: (page: string, params?: Record<string, string>) => void;
  onSearch?: (query: string) => void;
};

export function VoiceAssistant({ context, onNavigate, onSearch }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

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

  const startSession = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setError('المساعد الصوتي متاح حالياً على المتصفح فقط');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript('');
    setAiResponse('');

    try {
      // 1. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // 2. Set up audio playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 3. Get user microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);

      // 4. Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch {
          // ignore parse errors
        }
      };

      // 5. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 6. Send SDP to our backend which forwards to OpenAI /v1/realtime/calls
      const sdpRes = await fetch(`${SUPABASE_URL}/functions/v1/realtime-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...context, sdp: offer.sdp }),
      });

      if (!sdpRes.ok) {
        const errData = await sdpRes.json().catch(() => ({}));
        throw new Error(errData.error || `WebRTC connection failed: ${sdpRes.status}`);
      }

      const { sdp: answerSdp } = await sdpRes.json();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsListening(true);
      setIsConnecting(false);
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالمساعد الصوتي');
      setIsConnecting(false);
      stopSession();
    }
  }, [context]);

  const handleRealtimeEvent = useCallback((msg: any) => {
    switch (msg.type) {
      case 'conversation.item.input_audio_transcription.completed':
        setTranscript(msg.transcript || '');
        break;
      case 'response.audio_transcript.delta':
        setAiResponse((prev) => prev + (msg.delta || ''));
        break;
      case 'response.audio_transcript.done':
        // Full response received
        break;
      case 'response.function_call_arguments.done':
        handleFunctionCall(msg);
        break;
      case 'response.done':
        setAiResponse('');
        break;
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
          // Send function result back
          sendFunctionResult(msg.call_id, { success: true, message: `جاري البحث عن: ${args.query}` });
          break;
        case 'navigate_to':
          if (onNavigate) {
            onNavigate(args.page, args.searchQuery ? { query: args.searchQuery } : undefined);
          }
          sendFunctionResult(msg.call_id, { success: true, message: `تم التنقل إلى ${args.page}` });
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
  }, [onSearch, onNavigate]);

  const sendFunctionResult = useCallback((callId: string, result: any) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      }));
      // Trigger response generation
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  const stopSession = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
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
