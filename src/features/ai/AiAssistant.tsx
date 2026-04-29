import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { aiService } from '../services/aiService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const AiAssistant = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      text: 'Xin chào! Tôi là BiblioAI. Tôi có thể giúp gì cho hành trình đọc sách của bạn hôm nay?', 
      sender: 'ai', 
      timestamp: new Date() 
    }
  ]);
  const [loading, setLoading] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
      const response = await aiService.askLibrarian(userMsg.text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setIsVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3A75F2', '#1E2540']}
            style={styles.fabGradient}
          >
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <View style={styles.chatContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>BiblioAI</Text>
                    <Text style={styles.headerStatus}>Trực tuyến</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView 
                ref={scrollViewRef}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg) => (
                  <View 
                    key={msg.id} 
                    style={[
                      styles.messageRow, 
                      msg.sender === 'user' ? styles.userRow : styles.aiRow
                    ]}
                  >
                    <View style={[
                      styles.messageBubble,
                      msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                    ]}>
                      <Text style={[
                        styles.messageText,
                        msg.sender === 'user' ? styles.userText : styles.aiText
                      ]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={styles.timestamp}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
                {loading && (
                  <View style={styles.aiRow}>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                      <ActivityIndicator size="small" color="#3A75F2" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input */}
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập câu hỏi cho thủ thư..."
                  placeholderTextColor="#5A5F7A"
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} 
                  onPress={handleSend}
                  disabled={!input.trim() || loading}
                >
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 18, 29, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A75F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#10B981',
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 20,
    gap: 16,
  },
  messageRow: {
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#3A75F2',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1E2540',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#E1E4ED',
  },
  timestamp: {
    color: '#5A5F7A',
    fontSize: 10,
    marginTop: 4,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    backgroundColor: '#0F121D',
  },
  input: {
    flex: 1,
    backgroundColor: '#171B2B',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: '#FFFFFF',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3A75F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1E2540',
    opacity: 0.5,
  },
});
