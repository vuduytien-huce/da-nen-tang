import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ai } from '../../src/core/ai';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'model', 
      text: 'Chào bạn! Tôi là BiblioAI, thủ thư ảo của bạn. Bạn muốn tôi tìm giúp cuốn sách nào hay có thắc mắc gì không?', 
      timestamp: new Date() 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await ai.askLibrarian(text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (uri) {
      // In a real implementation, we would send this audio to an STT API
      // For now, we'll simulate voice recognition
      setIsLoading(true);
      setTimeout(() => {
        const simulatedText = "Tìm cho tôi sách trinh thám ở London";
        setInputText(simulatedText);
        setIsLoading(false);
        handleSend(simulatedText);
      }, 1500);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAi = item.role === 'model';
    return (
      <Animated.View 
        entering={isAi ? SlideInLeft : SlideInRight}
        style={[styles.messageWrapper, isAi ? styles.aiWrapper : styles.userWrapper]}
      >
        {isAi && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="white" />
          </View>
        )}
        <View style={[styles.messageBubble, isAi ? styles.aiBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAi ? styles.aiText : styles.userText]}>
            {item.text}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#0B0F1A', '#171B2B']} style={styles.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>BiblioAI Assistant</Text>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Đang trực tuyến</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#8B8FA3" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {messages.length === 1 && !isLoading && (
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
            {[
              "Gợi ý sách trinh thám hay",
              "Sách nào đang hot hiện nay?",
              "Làm sao để mượn sách?",
              "Tìm sách về AI & Công nghệ"
            ].map((text, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.quickActionChip}
                onPress={() => handleSend(text)}
              >
                <Text style={styles.quickActionText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#3A75F2" />
          <Text style={styles.typingText}>BiblioAI đang suy nghĩ...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <BlurView intensity={20} tint="dark" style={styles.inputBlur}>
          <TouchableOpacity 
            style={[styles.voiceBtn, isRecording && styles.recordingActive]} 
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Ionicons name={isRecording ? "mic" : "mic-outline"} size={22} color="white" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Hỏi BiblioAI về sách..."
            placeholderTextColor="#5A5F7A"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={() => handleSend(inputText)}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  background: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2540',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { color: '#8B8FA3', fontSize: 11, fontWeight: '600' },
  menuBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  messageWrapper: { flexDirection: 'row', marginBottom: 20, maxWidth: '85%' },
  aiWrapper: { alignSelf: 'flex-start' },
  userWrapper: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A75F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubble: {
    backgroundColor: '#151929',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  userBubble: {
    backgroundColor: '#3A75F2',
    borderTopRightRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  aiText: { color: '#E2E8F0' },
  userText: { color: 'white' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  typingText: { color: '#8B8FA3', fontSize: 12, fontStyle: 'italic' },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 25, 41, 0.8)',
    borderRadius: 30,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E2540',
    overflow: 'hidden',
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingActive: {
    backgroundColor: '#EF4444',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 16,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
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
    backgroundColor: '#1E2540',
    opacity: 0.5,
  },
  quickActionsContainer: {
    paddingBottom: 15,
  },
  quickActionsScroll: {
    paddingHorizontal: 20,
  },
  quickActionChip: {
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(58, 117, 242, 0.2)',
  },
  quickActionText: {
    color: '#3A75F2',
    fontSize: 13,
    fontWeight: '600',
  },
});
