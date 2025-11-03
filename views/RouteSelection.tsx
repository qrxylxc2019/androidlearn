import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';

interface RouteSelectionProps {
  onSelectRoute: (route: 'practice' | 'collection') => void;
}

export default function RouteSelection({ onSelectRoute }: RouteSelectionProps) {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.textDark]}>
        请选择学习模式
      </Text>
      
      <TouchableOpacity
        style={[styles.button, styles.practiceButton]}
        onPress={() => onSelectRoute('practice')}
        activeOpacity={0.7}>
        <Text style={styles.buttonText}>训练题目</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.collectionButton]}
        onPress={() => onSelectRoute('collection')}
        activeOpacity={0.7}>
        <Text style={styles.buttonText}>查看收藏</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  containerDark: {
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
  },
  textDark: {
    color: '#fff',
  },
  button: {
    width: '80%',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  practiceButton: {
    backgroundColor: '#007AFF',
  },
  collectionButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
