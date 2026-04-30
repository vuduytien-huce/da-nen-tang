import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ai } from '../../core/ai';
import { useAuthStore } from '../../store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const BiblioAI: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là BiblioAI. Tôi có thể giúp gì cho bạn hôm nay?',
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fabAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await ai.askLibrarian(userMsg.text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.fabContainer, 
          { transform: [{ scale: fabAnim }] }
        ]}
      >
        <TouchableOpacity 
          onPress={() => setVisible(true)}
          style={styles.fab}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3A75F2', '#6E45E2']}
            style={styles.fabGradient}
          >
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatContainer}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>BiblioAI Assistant</Text>
                  <Text style={styles.headerStatus}>Trực tuyến • Sẵn sàng hỗ trợ</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#8A8F9E" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubble, 
                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    msg.sender === 'user' ? styles.userText : styles.aiText
                  ]}>
                    {msg.text}
                  </Text>
                  <Text style={styles.timestamp}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#3A75F2" />
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi của bạn..."
                placeholderTextColor="#5A5F7A"
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity 
                onPress={handleSend}
                disabled={!input.trim() || loading}
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#0F121D',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#1F263B',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F263B',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A75F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3A75F2',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#171B2B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#E2E8F0',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  loadingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F263B',
    backgroundColor: '#0F121D',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#171B2B',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: '#FFFFFF',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A75F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1F263B',
    opacity: 0.5,
  },
});
