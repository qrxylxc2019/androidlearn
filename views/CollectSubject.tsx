import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  NativeModules,
  Vibration,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Subject } from '../types';

const { StudentDatabaseModule } = NativeModules;

interface CollectSubjectProps {
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
}

export default function CollectSubject({ onSelectSubject, onBack }: CollectSubjectProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 震动函数
  const handleVibrate = () => {
    Vibration.vibrate(50);
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!StudentDatabaseModule) {
        throw new Error('StudentDatabaseModule 未找到。请确保已重新编译应用。');
      }

      if (typeof StudentDatabaseModule.getAllSubjects !== 'function') {
        throw new Error('getAllSubjects 方法不存在');
      }

      const subjectsData = await StudentDatabaseModule.getAllSubjects();
      setSubjects(subjectsData as Subject[]);
    } catch (err: any) {
      setError(err.message || '加载科目失败');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderSubject = ({ item }: { item: Subject }) => {
    return (
      <TouchableOpacity
        style={styles.subjectCardContainer}
        onPress={() => {
          handleVibrate();
          onSelectSubject(item);
        }}
        activeOpacity={0.7}>
        <LinearGradient
          colors={['#deecdd', '#c1dfc4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.subjectCard, isDarkMode && styles.subjectCardDark]}>
          <Text style={[styles.subjectName, isDarkMode && styles.textDark]}>
            {item.title || item.name}
          </Text>
          <Text style={styles.subjectArrow}>›</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            加载中...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.centerContent}>
        <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
          错误: {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, isDarkMode && styles.retryButtonDark]}
          onPress={() => {
            handleVibrate();
            loadSubjects();
          }}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            暂无科目
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => {
          handleVibrate();
          onBack();
        }} style={styles.backButton}>
          <Text style={styles.backButtonIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          选择科目查看收藏
        </Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={subjects}
        renderItem={renderSubject}
        keyExtractor={(item) => `subject-${item.id}`}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDark: {
    backgroundColor: '#1c1c1e',
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: '#007AFF',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 50,
  },
  listContent: {
    padding: 16,
  },
  subjectCardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  subjectCard: {
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectCardDark: {
    backgroundColor: '#1c1c1e',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5a9c5e',
  },
  subjectArrow: {
    fontSize: 24,
    color: '#a8d5ab',
    fontWeight: 'bold',
  },
  textDark: {
    color: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTextDark: {
    color: '#ef5350',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonDark: {
    backgroundColor: '#0A84FF',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
