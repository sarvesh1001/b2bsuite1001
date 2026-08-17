import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { sendChatMessage } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ===== LOGGING =====
console.log('[ChatScreen] Module loaded');
console.log('[ChatScreen] EXPO_PUBLIC_CHATBOT_API_URL:', process.env.EXPO_PUBLIC_CHATBOT_API_URL);
console.log('[ChatScreen] sendChatMessage is available:', typeof sendChatMessage === 'function');

type NavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  console.log('[ChatScreen] Render - accessToken:', accessToken ? '✅ exists' : '❌ missing');
  console.log('[ChatScreen] Render - deviceId:', deviceId || '❌ missing');
  console.log('[ChatScreen] Render - companyId:', companyId || '❌ missing');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! How can I assist you with payroll today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    console.log('[ChatScreen] handleSend called');
    const trimmed = input.trim();
    if (!trimmed || loading) {
      console.log('[ChatScreen] Aborting: empty or loading');
      return;
    }

    console.log('[ChatScreen] Message content:', trimmed);

    if (!accessToken || !deviceId) {
      console.error('[ChatScreen] Missing auth or device - accessToken:', !!accessToken, 'deviceId:', deviceId);
      Alert.alert('Error', 'Missing authentication or device information. Please log in again.');
      return;
    }

    console.log('[ChatScreen] All checks passed - calling sendChatMessage');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      console.log('[ChatScreen] Sending request with params:', {
        messageLength: trimmed.length,
        accessTokenLength: accessToken.length,
        deviceId,
        companyId: companyId || 'empty',
      });

      const response = await sendChatMessage(
        trimmed,
        accessToken,
        deviceId,
        companyId || ''
      );

      console.log('[ChatScreen] Response received:', response);

      let assistantMsg: Message;
      if (response.success) {
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || 'Operation completed.',
        };
        if (response.data) {
          assistantMsg.content += '\n\n' + JSON.stringify(response.data, null, 2);
        }
      } else {
        let errorMessage = response.message || 'An error occurred.';
        if (response.type === 'session_error') {
          errorMessage = 'Session expired. Please log in again.';
        } else if (response.type === 'permission_error') {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.type === 'tool_error') {
          errorMessage = 'Tool execution failed: ' + errorMessage;
        }
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: errorMessage,
          isError: true,
        };
      }
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('[ChatScreen] Error caught:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: error?.response?.data?.message || error.message || 'Network error',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      console.log('[ChatScreen] handleSend finished');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payroll Assistant</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isError = msg.role === 'system';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                    isError && styles.errorBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser && styles.userText,
                      isError && styles.errorText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              );
            })}
            {loading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={TEXT_SECONDARY}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              editable={!loading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || loading) && styles.disabledButton]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Icon name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  errorBubble: {
    alignSelf: 'center',
    backgroundColor: ERROR_COLOR,
    borderWidth: 0,
  },
  messageText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  userText: {
    color: '#fff',
  },
  errorText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 30,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});