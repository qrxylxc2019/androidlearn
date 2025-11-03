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
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Subject } from '../types';

const { StudentDatabaseModule } = NativeModules;

interface SubjectListProps {
  onSelectSubject: (subject: Subject) => void;
  onStartMultiSubjectLearn: (subjectIds: number[], questionCount: number, repeatCount: number, questionType: string) => void;
  onBack?: () => void;
}

export default function SubjectList({ onSelectSubject, onStartMultiSubjectLearn, onBack }: SubjectListProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState<string>('20');
  const [repeatCount, setRepeatCount] = useState<string>('5');
  const [questionType, setQuestionType] = useState<string>('客观题');

  const questionTypes = ['客观题', '主观题'];

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

  const toggleSubjectSelection = (subjectId: number) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedSubjectIds.length > 0) {
      const qCount = parseInt(questionCount) || 20;
      const rCount = parseInt(repeatCount) || 5;
      onStartMultiSubjectLearn(selectedSubjectIds, qCount, rCount, questionType);
    }
  };

  const renderSubject = ({ item }: { item: Subject }) => {
    const isSelected = selectedSubjectIds.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.subjectCardContainer}
        onPress={() => toggleSubjectSelection(item.id)}
        activeOpacity={0.7}>
        <LinearGradient
          colors={['#deecdd', '#c1dfc4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.subjectCard, isDarkMode && styles.subjectCardDark]}>
          <View style={styles.subjectContent}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.subjectName, isDarkMode && styles.textDark]}>
              {item.title || item.name}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
        <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
          加载中...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
          错误: {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, isDarkMode && styles.retryButtonDark]}
          onPress={loadSubjects}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
          暂无科目
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.leftPanel}>
        {onBack && (
          <TouchableOpacity
            style={[styles.backButton, isDarkMode && styles.backButtonDark]}
            onPress={onBack}
            activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
            选题数量:
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            value={questionCount}
            onChangeText={setQuestionCount}
            keyboardType="numeric"
            placeholder="20"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
            重复次数:
          </Text>
          <View style={styles.inputWithButtons}>
            <TouchableOpacity
              style={[styles.counterButton, isDarkMode && styles.counterButtonDark]}
              onPress={() => {
                const current = parseInt(repeatCount) || 1;
                if (current > 1) {
                  setRepeatCount(String(current - 1));
                }
              }}
              activeOpacity={0.7}>
              <Text style={[styles.counterButtonText, isDarkMode && styles.textDark]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.inputWithCounter, isDarkMode && styles.inputDark]}
              value={repeatCount}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setRepeatCount(String(Math.max(1, num)));
              }}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.counterButton, isDarkMode && styles.counterButtonDark]}
              onPress={() => {
                const current = parseInt(repeatCount) || 1;
                setRepeatCount(String(current + 1));
              }}
              activeOpacity={0.7}>
              <Text style={[styles.counterButtonText, isDarkMode && styles.textDark]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
            题目类型:
          </Text>
          <View style={styles.buttonGroup}>
            {questionTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.buttonGroupItem,
                  isDarkMode && styles.buttonGroupItemDark,
                  questionType === type && styles.buttonGroupItemActive,
                ]}
                onPress={() => setQuestionType(type)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.buttonGroupText,
                    isDarkMode && styles.textDark,
                    questionType === type && styles.buttonGroupTextActive,
                  ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            isDarkMode && styles.confirmButtonDark,
            selectedSubjectIds.length === 0 && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={selectedSubjectIds.length === 0}>
          <Text style={styles.confirmButtonText}>
            确认 ({selectedSubjectIds.length})
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rightPanel}>
        <FlatList
          data={subjects}
          renderItem={renderSubject}
          keyExtractor={(item) => `subject-${item.id}`}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: '30%',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  backButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  backButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  rightPanel: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  selectedList: {
    flex: 1,
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  selectedItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItemDark: {
    backgroundColor: '#2c2c2e',
  },
  selectedItemText: {
    fontSize: 14,
    color: '#000',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },
  inputDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#444',
    color: '#fff',
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithCounter: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  counterButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonDark: {
    backgroundColor: '#0A84FF',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDark: {
    backgroundColor: '#0A84FF',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonGroupItem: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  buttonGroupItemDark: {
    backgroundColor: '#2c2c2e',
    borderRightColor: '#444',
  },
  buttonGroupItemActive: {
    backgroundColor: '#007AFF',
  },
  buttonGroupText: {
    fontSize: 16,
    color: '#000',
  },
  buttonGroupTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  },
  subjectCardDark: {
    backgroundColor: '#1c1c1e',
  },
  subjectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#a8d5ab',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#a8d5ab',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5a9c5e',
    flex: 1,
  },
  subjectArrow: {
    fontSize: 24,
    color: '#007AFF',
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

