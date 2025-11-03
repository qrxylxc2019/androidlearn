import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  NativeModules,
  useWindowDimensions,
  ScrollView,
  Alert,
  Platform,
  ToastAndroid,
  Animated,
  TextInput,
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import { Question, Option, Subject, ExamQuestion, ExamItem, SubQuestion } from '../types';

const { StudentDatabaseModule } = NativeModules;

interface LearnProps {
  subject?: Subject;
  subjectIds?: number[];
  questionCount?: number;
  repeatCount?: number;
  onBack: () => void;
  isCollectionMode?: boolean;
  questionType?: string;
}

export default function Learn({ subject, subjectIds, questionCount = 20, repeatCount = 5, onBack, isCollectionMode = false, questionType = '客观题' }: LearnProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examItems, setExamItems] = useState<Map<number, ExamItem[]>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [deletedOptions, setDeletedOptions] = useState<string[]>([]);
  const [subQuestionAnswers, setSubQuestionAnswers] = useState<Map<number, Map<number, string>>>(new Map());
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [subSelectedOptions, setSubSelectedOptions] = useState<string[]>([]);
  const [isSubAnswerSubmitted, setIsSubAnswerSubmitted] = useState<boolean>(false);
  const [showSubjectiveAnswer, setShowSubjectiveAnswer] = useState<boolean>(false);

  // Toast 相关状态
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastOpacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadQuestions();
  }, [subject?.id, subjectIds]);

  // 加载第一题的 exam_items（仅主观题）
  useEffect(() => {
    const loadFirstExamItems = async () => {
      if (questionType === '主观题' && examQuestions.length > 0 && currentIndex === 0) {
        const firstQuestion = examQuestions[0];
        if (firstQuestion && !examItems.has(firstQuestion.id)) {
          try {
            console.log(`正在加载第一题 ${firstQuestion.id} 的小题...`);
            const itemsData = await StudentDatabaseModule.getExamItemsByQuestionId(firstQuestion.id);
            console.log(`题目 ${firstQuestion.id} 的小题数量:`, itemsData.length);
            setExamItems(prev => new Map(prev).set(firstQuestion.id, itemsData as ExamItem[]));
          } catch (err) {
            console.error('加载第一题小题失败:', err);
          }
        }
      }
    };
    loadFirstExamItems();
  }, [examQuestions, questionType]);

  useEffect(() => {
    // 切换题目时清空选项和提交状态
    setSelectedOptions([]);
    setIsAnswerSubmitted(false);
    setDeletedOptions([]);
    setCurrentSubIndex(0); // 重置小题索引
    setSubSelectedOptions([]);
    setIsSubAnswerSubmitted(false);
  }, [currentIndex]);

  useEffect(() => {
    // 切换小题时清空小题选项和提交状态
    setSubSelectedOptions([]);
    setIsSubAnswerSubmitted(false);
    setShowSubjectiveAnswer(false);
  }, [currentSubIndex]);

  // 显示 Toast 提示
  const showToast = (message: string, type: 'success' | 'error', duration: number = 0.5) => {
    // 使用自定义 Toast（跨平台统一样式）
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.delay(duration * 1000), // 将秒转换为毫秒
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const loadQuestions = async () => {
    try {
      console.log('========== loadQuestions 开始 ==========');
      console.log('questionType:', questionType);
      console.log('subject:', subject);
      console.log('subjectIds:', subjectIds);

      setError(null);
      setLoading(true);

      if (!StudentDatabaseModule) {
        throw new Error('StudentDatabaseModule 未找到。请确保已重新编译应用。');
      }

      if (questionType === '主观题') {
        console.log('加载主观题模式');
        // 加载主观题（从 exam_question 表，不加载 exam_items）
        let allExamQuestions: ExamQuestion[] = [];

        if (subjectIds && subjectIds.length > 0) {
          console.log('多科目模式，科目数量:', subjectIds.length);
          for (const subjectId of subjectIds) {
            console.log(`正在加载科目 ${subjectId} 的主观题...`);
            const examQuestionsData = await StudentDatabaseModule.getExamQuestionsBySubject(subjectId);
            console.log(`科目 ${subjectId} 返回的题目数量:`, examQuestionsData.length);
            console.log(`科目 ${subjectId} 返回的题目数据:`, JSON.stringify(examQuestionsData, null, 2));

            const subjectExamQuestions = examQuestionsData as ExamQuestion[];

            // 随机选择指定数量的题
            const shuffled = [...subjectExamQuestions].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

            // 重复指定次数
            for (let i = 0; i < repeatCount; i++) {
              allExamQuestions = allExamQuestions.concat(selected);
            }
          }

          // 打乱所有题目顺序
          allExamQuestions = allExamQuestions.sort(() => Math.random() - 0.5);
        } else if (subject) {
          console.log('单科目模式，科目ID:', subject.id);
          const examQuestionsData = await StudentDatabaseModule.getExamQuestionsBySubject(subject.id);
          console.log('返回的题目数量:', examQuestionsData.length);
          console.log('返回的题目数据:', JSON.stringify(examQuestionsData, null, 2));
          allExamQuestions = examQuestionsData as ExamQuestion[];
        }

        console.log('总共加载的主观题数量:', allExamQuestions.length);

        console.log('设置 examQuestions，数量:', allExamQuestions.length);
        setExamQuestions(allExamQuestions);
        // 不再在这里加载 exam_items，而是在切换题目时按需加载
      } else {
        console.log('加载客观题模式');
        // 加载客观题（从 question 表）
        let allQuestions: Question[] = [];

        if (isCollectionMode && subject) {
          // 收藏模式：只加载收藏的题目
          if (typeof StudentDatabaseModule.getCollectedQuestionsBySubject !== 'function') {
            throw new Error('getCollectedQuestionsBySubject 方法不存在');
          }
          const questionsData = await StudentDatabaseModule.getCollectedQuestionsBySubject(subject.id);
          allQuestions = questionsData as Question[];
        } else if (subjectIds && subjectIds.length > 0) {
          // 多科目模式：从每个科目随机选指定数量的题，重复指定次数
          if (typeof StudentDatabaseModule.getQuestionsBySubject !== 'function') {
            throw new Error('getQuestionsBySubject 方法不存在');
          }
          for (const subjectId of subjectIds) {
            const questionsData = await StudentDatabaseModule.getQuestionsBySubject(subjectId);
            const subjectQuestions = questionsData as Question[];

            // 随机选择指定数量的题
            const shuffled = [...subjectQuestions].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

            // 重复指定次数
            for (let i = 0; i < repeatCount; i++) {
              allQuestions = allQuestions.concat(selected);
            }
          }

          // 打乱所有题目顺序
          allQuestions = allQuestions.sort(() => Math.random() - 0.5);
        } else if (subject) {
          // 单科目模式
          if (typeof StudentDatabaseModule.getQuestionsBySubject !== 'function') {
            throw new Error('getQuestionsBySubject 方法不存在');
          }
          const questionsData = await StudentDatabaseModule.getQuestionsBySubject(subject.id);
          allQuestions = questionsData as Question[];
        }

        setQuestions(allQuestions);
      }

      console.log('========== loadQuestions 结束 ==========');
    } catch (err: any) {
      console.error('加载题目时发生错误:', err);
      setError(err.message || '加载题目失败');
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  // 解析选项
  const parseOptions = (itemsHtml: string): Option[] => {
    if (!itemsHtml) return [];

    const options: Option[] = [];

    // 方法1: 匹配带HTML标签的格式 <p>A. xxx</p> 或 <p>A、xxx</p>
    const htmlRegex = /<p>([A-Z])[.、](.+?)<\/p>/gi;
    let match;
    while ((match = htmlRegex.exec(itemsHtml)) !== null) {
      options.push({
        label: match[1],
        content: match[2].trim(),
      });
    }

    // 如果找到了选项，直接返回
    if (options.length > 0) return options;

    // 方法2: 去除所有HTML标签后，按行匹配纯文本格式
    const textOnly = itemsHtml.replace(/<[^>]+>/g, '').trim();

    // 匹配 A. xxx 或 A、xxx 格式（支持换行符）
    const textRegex = /([A-Z])[.、]\s*([^\n\r]+)/g;
    while ((match = textRegex.exec(textOnly)) !== null) {
      const content = match[2].trim();
      if (content) {
        options.push({
          label: match[1],
          content: content,
        });
      }
    }

    return options;
  };

  // 解析主观题的小题
  const parseSubQuestions = (questionText: string): { material: string; subQuestions: SubQuestion[] } => {
    let material = '';
    const subQuestions: SubQuestion[] = [];

    // 提取大题材料
    const materialMatch = questionText.match(/【题目材料】([\s\S]*?)【\/题目材料】/);
    if (materialMatch) {
      material = materialMatch[1].trim();
    }

    // 提取所有小题
    const subQuestionRegex = /【小题(\d+)】([\s\S]*?)【\/小题\1】/g;
    let match;
    while ((match = subQuestionRegex.exec(questionText)) !== null) {
      const index = parseInt(match[1]);
      const content = match[2];

      // 提取类型
      const typeMatch = content.match(/【类型】(.*?)【\/类型】/);
      const type = typeMatch ? typeMatch[1].trim() : '';

      // 提取材料
      const materialMatch = content.match(/【材料】([\s\S]*?)【\/材料】/);
      const subMaterial = materialMatch ? materialMatch[1].trim() : '';

      // 提取选项
      const optionsMatch = content.match(/【选项】([\s\S]*?)【\/选项】/);
      const options = optionsMatch ? optionsMatch[1].trim() : '';

      // 提取答案
      const answerMatch = content.match(/【答案】([\s\S]*?)【\/答案】/);
      const answer = answerMatch ? answerMatch[1].trim() : '';

      // 提取解析
      const explainMatch = content.match(/【解析】([\s\S]*?)【\/解析】/);
      const explain = explainMatch ? explainMatch[1].trim() : '';

      subQuestions.push({
        index,
        type,
        material: subMaterial,
        options,
        answer,
        explain,
      });
    }

    return { material, subQuestions };
  };

  // 判断当前题目是否为单选题
  const isSingleChoice = (question: Question): boolean => {
    const type = question.questiontype?.toLowerCase() || '';
    return type.includes('单选') || type === '单选题';
  };

  const toggleDeleteOption = (optionLabel: string) => {
    setDeletedOptions((prev) => {
      if (prev.includes(optionLabel)) {
        return prev.filter((label) => label !== optionLabel);
      } else {
        // 如果该选项已经被选中，取消选择
        if (selectedOptions.includes(optionLabel)) {
          setSelectedOptions((prevSelected) =>
            prevSelected.filter((label) => label !== optionLabel)
          );
          setIsAnswerSubmitted(false);
        }
        return [...prev, optionLabel];
      }
    });
  };

  const toggleOption = (optionLabel: string) => {
    const question = questions[currentIndex];
    const isSingle = isSingleChoice(question);
    const correctAnswer = question.answer?.replace(/<[^>]+>/g, '').trim() || '';

    setSelectedOptions((prev) => {
      const isSelected = prev.includes(optionLabel);
      let newSelection: string[];

      if (isSingle) {
        if (isSelected) {
          // 取消选择，同时重置提交状态
          setIsAnswerSubmitted(false);
          return []; // 取消选择
        } else {
          // 检查答案是否正确
          const isCorrect = optionLabel === correctAnswer;
          if (isCorrect) {
            // 答对了，标记为已提交并显示 Toast
            setIsAnswerSubmitted(true);
            showToast('✓ 回答正确！', 'success');
          } else {
            // 答错了，重置提交状态并显示 Toast
            setIsAnswerSubmitted(false);
            showToast('✗ 回答错误，请继续尝试', 'error');
          }
          return [optionLabel]; // 只选择当前选项
        }
      } else {
        // 多选题：可以选择多个选项
        if (isSelected) {
          newSelection = prev.filter((label) => label !== optionLabel);
        } else {
          newSelection = [...prev, optionLabel];
        }

        // 判断多选题答案是否正确
        if (newSelection.length > 0) {
          const userAnswer = newSelection.sort().join('');
          const isCorrect = userAnswer === correctAnswer;

          // 显示 Toast 提示
          if (isCorrect) {
            showToast('✓ 回答正确！', 'success');
            setIsAnswerSubmitted(true);
          } else {
            showToast('✗ 回答错误，请继续尝试', 'error');
            setIsAnswerSubmitted(false);
          }
        } else {
          setIsAnswerSubmitted(false);
        }

        return newSelection;
      }
    });
  };

  // 小题选项点击处理
  const toggleSubOption = (optionLabel: string, item: ExamItem) => {
    const correctAnswer = item.answer?.replace(/<[^>]+>/g, '').trim() || '';
    const isSingle = item.type === '判断题' || correctAnswer.length === 1;

    setSubSelectedOptions((prev) => {
      const isSelected = prev.includes(optionLabel);
      let newSelection: string[];

      if (isSingle) {
        if (isSelected) {
          // 取消选择，同时重置提交状态
          setIsSubAnswerSubmitted(false);
          return []; // 取消选择
        } else {
          // 检查答案是否正确
          const isCorrect = optionLabel === correctAnswer;
          if (isCorrect) {
            // 答对了，标记为已提交并显示 Toast
            setIsSubAnswerSubmitted(true);
            showToast('✓ 回答正确！', 'success');
          } else {
            // 答错了，重置提交状态并显示 Toast
            setIsSubAnswerSubmitted(false);
            showToast('✗ 回答错误，请继续尝试', 'error');
          }
          return [optionLabel]; // 只选择当前选项
        }
      } else {
        // 多选题：可以选择多个选项
        if (isSelected) {
          newSelection = prev.filter((label) => label !== optionLabel);
        } else {
          newSelection = [...prev, optionLabel];
        }

        // 判断多选题答案是否正确
        if (newSelection.length > 0) {
          const userAnswer = newSelection.sort().join('');
          const isCorrect = userAnswer === correctAnswer;

          // 显示 Toast 提示
          if (isCorrect) {
            showToast('✓ 回答正确！', 'success');
            setIsSubAnswerSubmitted(true);
          } else {
            showToast('✗ 回答错误，请继续尝试', 'error');
            setIsSubAnswerSubmitted(false);
          }
        } else {
          setIsSubAnswerSubmitted(false);
        }

        return newSelection;
      }
    });
  };

  // 检查答案是否正确
  const checkAnswer = (): boolean | null => {
    if (!isAnswerSubmitted) {
      return null;
    }

    const question = questions[currentIndex];
    // 从answer字段中提取正确答案（通常格式为 <p>A</p> 或 <p>AB</p>）
    const answerText = question.answer?.replace(/<[^>]+>/g, '').trim() || '';

    // 将选中的选项排序后组合成字符串
    const userAnswer = selectedOptions.sort().join('');

    // 比较答案
    return userAnswer === answerText;
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextQuestion = async () => {
    const maxIndex = questionType === '客观题' ? questions.length - 1 : examQuestions.length - 1;
    if (currentIndex < maxIndex) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // 如果是主观题，加载下一题的 exam_items
      if (questionType === '主观题') {
        const nextQuestion = examQuestions[nextIndex];
        if (nextQuestion && !examItems.has(nextQuestion.id)) {
          try {
            console.log(`正在加载题目 ${nextQuestion.id} 的小题...`);
            const itemsData = await StudentDatabaseModule.getExamItemsByQuestionId(nextQuestion.id);
            console.log(`题目 ${nextQuestion.id} 的小题数量:`, itemsData.length);
            setExamItems(prev => new Map(prev).set(nextQuestion.id, itemsData as ExamItem[]));
          } catch (err) {
            console.error('加载小题失败:', err);
          }
        }
      }
    }
  };

  const handlePrevSubQuestion = () => {
    if (currentSubIndex > 0) {
      setCurrentSubIndex(currentSubIndex - 1);
    }
  };

  const handleNextSubQuestion = () => {
    if (questionType === '主观题' && currentExamQuestion) {
      const currentItems = examItems.get(currentExamQuestion.id) || [];
      if (currentSubIndex < currentItems.length - 1) {
        setCurrentSubIndex(currentSubIndex + 1);
      }
    }
  };

  const handleDeleteQuestion = async () => {
    const currentQuestion = questions[currentIndex];

    try {
      // 调用删除方法
      await StudentDatabaseModule.deleteQuestion(currentQuestion.id);

      // 从列表中移除题目
      const updatedQuestions = questions.filter((_, index) => index !== currentIndex);
      setQuestions(updatedQuestions);

      // 重置选项和提交状态
      setSelectedOptions([]);
      setIsAnswerSubmitted(false);
      setDeletedOptions([]);

      // 调整当前索引
      if (updatedQuestions.length === 0) {
        // 如果没有题目了，返回科目列表
        onBack();
      } else if (currentIndex >= updatedQuestions.length) {
        // 如果删除的是最后一题，显示前一题
        setCurrentIndex(updatedQuestions.length - 1);
      }
    } catch (err: any) {
      Alert.alert('删除失败', err.message || '删除题目时发生错误');
      console.error('Error deleting question:', err);
    }
  };

  const handleDeleteSubQuestion = () => {
    if (!currentExamQuestion) return;

    const currentItems = examItems.get(currentExamQuestion.id) || [];
    if (currentSubIndex >= currentItems.length) return;

    // 从列表中移除小题（仅前端删除）
    const updatedItems = currentItems.filter((_, index) => index !== currentSubIndex);

    // 更新 examItems Map
    const newExamItems = new Map(examItems);
    if (updatedItems.length === 0) {
      // 如果该大题没有小题了，删除整个大题
      newExamItems.delete(currentExamQuestion.id);
      const updatedExamQuestions = examQuestions.filter((_, index) => index !== currentIndex);
      setExamQuestions(updatedExamQuestions);

      if (updatedExamQuestions.length === 0) {
        // 如果没有题目了，返回
        onBack();
      } else if (currentIndex >= updatedExamQuestions.length) {
        setCurrentIndex(updatedExamQuestions.length - 1);
      }
    } else {
      newExamItems.set(currentExamQuestion.id, updatedItems);
      setExamItems(newExamItems);

      // 调整当前小题索引
      if (currentSubIndex >= updatedItems.length) {
        setCurrentSubIndex(updatedItems.length - 1);
      }
    }

    // 重置小题选项和提交状态
    setSubSelectedOptions([]);
    setIsSubAnswerSubmitted(false);
    setShowSubjectiveAnswer(false);

    showToast('已删除小题', 'success', 0.5);
  };

  const handleToggleCollect = async () => {
    const currentQuestion = questions[currentIndex];
    const isCurrentlyCollected = currentQuestion.iscollect === '1';
    const newCollectStatus = isCurrentlyCollected ? '0' : '1';

    try {
      // 调用更新收藏状态的方法
      await StudentDatabaseModule.updateQuestionCollectStatus(currentQuestion.id, newCollectStatus);

      // 更新本地状态
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        iscollect: newCollectStatus,
      };
      setQuestions(updatedQuestions);

      // 显示提示
      showToast(
        isCurrentlyCollected ? '已取消收藏' : '已收藏',
        'success',
        0.5
      );
    } catch (err: any) {
      Alert.alert('操作失败', err.message || '更新收藏状态时发生错误');
      console.error('Error updating collect status:', err);
    }
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
            onPress={loadQuestions}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (questionType === '客观题' && questions.length === 0) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            该科目暂无题目
          </Text>
          <TouchableOpacity
            style={[styles.backButton, isDarkMode && styles.backButtonDark]}
            onPress={onBack}>
            <Text style={styles.backButtonText}>返回科目列表</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (questionType === '主观题' && examQuestions.length === 0) {
    console.log('显示"该科目暂无主观题"提示');
    console.log('examQuestions.length:', examQuestions.length);
    console.log('examQuestions:', examQuestions);
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            该科目暂无主观题
          </Text>
          <TouchableOpacity
            style={[styles.backButton, isDarkMode && styles.backButtonDark]}
            onPress={onBack}>
            <Text style={styles.backButtonText}>返回科目列表</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const contentWidth = width - 64;

  // 客观题相关变量
  let currentQuestion: Question | null = null;
  let options: Option[] = [];
  let isCorrect: boolean | null = null;
  let correctAnswer = '';

  // 主观题相关变量
  let currentExamQuestion: ExamQuestion | null = null;
  let currentExamItems: ExamItem[] = [];
  let parsedSubQuestions: SubQuestion[] = [];
  let mainMaterial = '';

  if (questionType === '客观题' && questions.length > 0) {
    currentQuestion = questions[currentIndex];
    options = parseOptions(currentQuestion.items);
    isCorrect = checkAnswer();
    correctAnswer = currentQuestion.answer?.replace(/<[^>]+>/g, '').trim() || '';
  } else if (questionType === '主观题' && examQuestions.length > 0) {
    currentExamQuestion = examQuestions[currentIndex];
    currentExamItems = examItems.get(currentExamQuestion.id) || [];
    console.log('当前题目ID:', currentExamQuestion.id);
    console.log('当前题目的小题数量:', currentExamItems.length);
    console.log('当前题目的小题数据:', JSON.stringify(currentExamItems, null, 2));
    // 使用 exam_items 表的数据，而不是解析 question 字段
    mainMaterial = currentExamQuestion.question || '';
  }

  const baseStyle = {
    body: {
      color: isDarkMode ? '#fff' : '#000',
    },
    p: {
      margin: 0,
      padding: 0,
    },
  };

  const questionStyle = {
    body: {
      ...baseStyle.body,
      fontSize: 18,
      lineHeight: 25,
    },
  };

  const answerStyle = {
    body: {
      color: '#34C759',
      fontSize: 15,
      fontWeight: '600' as const,
    },
  };

  const explainStyle = {
    body: {
      ...baseStyle.body,
      fontSize: 14,
      lineHeight: 20,
    },
  };

  // 渲染客观题
  const renderObjectiveQuestion = () => {
    if (!currentQuestion) return null;
    return (
      <>
        {/* 题目文本区域 - 固定高度可滚动 */}
        <ScrollView
          style={styles.questionScrollView}
          contentContainerStyle={styles.questionScrollContent}
          showsVerticalScrollIndicator={true}>
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: `${currentIndex + 1}/${questions.length}【${currentQuestion.questiontype} 】${currentQuestion.question}` }}
            tagsStyles={questionStyle}
          />
        </ScrollView>

        {/* 选项、答案、解析区域 - 可滚动 */}
        <ScrollView
          style={styles.answersScrollView}
          contentContainerStyle={styles.answersScrollContent}
          showsVerticalScrollIndicator={true}>
          {options.length > 0 && (
            <View>
              <View style={styles.optionsContainer}>
                {options.map((option) => {
                  const isSelected = selectedOptions.includes(option.label);
                  const isCorrectOption = correctAnswer.includes(option.label);
                  const isSingle = isSingleChoice(currentQuestion);
                  const isDeleted = deletedOptions.includes(option.label);

                  const showCorrect = isAnswerSubmitted && (
                    isSingle ? (isSelected && isCorrectOption) : isCorrectOption
                  );

                  return (
                    <View key={option.label} style={styles.optionWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.deleteOptionButton,
                          isDarkMode && styles.deleteOptionButtonDark,
                          isDeleted && styles.deleteOptionButtonActive,
                        ]}
                        onPress={() => toggleDeleteOption(option.label)}
                        activeOpacity={0.7}>
                        <Text style={[
                          styles.deleteOptionButtonText,
                          isDeleted && styles.deleteOptionButtonTextActive,
                        ]}>
                          删除
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isDarkMode && styles.optionItemDark,
                          isSelected && !showCorrect && styles.optionItemSelected,
                          isSelected && !showCorrect && isDarkMode && styles.optionItemSelectedDark,
                          showCorrect && styles.optionItemCorrect,
                          isDeleted && styles.optionItemDisabled,
                        ]}
                        onPress={() => !isDeleted && toggleOption(option.label)}
                        activeOpacity={0.7}
                        disabled={isDeleted}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isDarkMode && styles.textDark,
                            showCorrect && styles.optionTextCorrect,
                            isDeleted && styles.optionTextDeleted,
                          ]}>
                          {option.label}.
                        </Text>
                        <Text
                          style={[
                            styles.optionContent,
                            isDarkMode && styles.textDark,
                            showCorrect && styles.optionTextCorrect,
                            isDeleted && styles.optionTextDeleted,
                          ]}>
                          {option.content}
                        </Text>
                        {showCorrect && (
                          <Text style={styles.optionIcon}>✓</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {currentQuestion.explain && (
            <View style={styles.questionSection}>
              <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>
                解析:
              </Text>
              <View style={styles.htmlContainer}>
                <RenderHTML
                  contentWidth={contentWidth}
                  source={{ html: currentQuestion.explain }}
                  tagsStyles={explainStyle}
                />
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.sectionLabel, isDarkMode && styles.textDark]}>
              答案:
            </Text>
            <View style={styles.htmlContainer}>
              <RenderHTML
                contentWidth={contentWidth}
                source={{ html: currentQuestion.answer || '' }}
                tagsStyles={answerStyle}
              />
            </View>
          </View>
        </ScrollView>
      </>
    );
  };

  // 渲染主观题
  const renderSubjectiveQuestion = () => {
    if (!currentExamQuestion) return null;

    return (
      <>
        {/* 大题材料区域 - 固定高度可滚动 */}
        <ScrollView
          style={styles.questionScrollView}
          contentContainerStyle={styles.questionScrollContent}
          showsVerticalScrollIndicator={true}>
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: `大题${currentIndex + 1}/${examQuestions.length}：${mainMaterial || ''}` }}
            tagsStyles={questionStyle}
          />
        </ScrollView>

        {/* 小题区域 - 可滚动 */}
        <ScrollView
          style={styles.answersScrollView}
          contentContainerStyle={styles.answersScrollContent}
          showsVerticalScrollIndicator={true}>
          {currentExamItems.length > 0 && currentSubIndex < currentExamItems.length && (() => {
            const item = currentExamItems[currentSubIndex];
            const subOptions = parseOptions(item.items || '');
            const isChoiceOrJudge = item.type === '选择题' || item.type === '判断题';
            const correctAnswer = item.answer?.replace(/<[^>]+>/g, '').trim() || '';

            return (
              <View key={currentSubIndex} style={styles.subQuestionContainer}>
                <View style={styles.subQuestionContent}>
                  <RenderHTML
                    contentWidth={contentWidth}
                    source={{ html: `小题${currentSubIndex + 1}/${currentExamItems.length}：【${item.type}】${item.question || ''}` }}
                    tagsStyles={questionStyle}
                  />
                </View>

                {isChoiceOrJudge && subOptions.length > 0 && (
                  <View style={styles.optionsContainer}>
                    {subOptions.map((option) => {
                      const isSelected = subSelectedOptions.includes(option.label);
                      const isCorrectOption = correctAnswer.includes(option.label);
                      const isSingle = item.type === '判断题' || correctAnswer.length === 1;

                      const showCorrect = isSubAnswerSubmitted && (
                        isSingle ? (isSelected && isCorrectOption) : isCorrectOption
                      );

                      return (
                        <View key={option.label} style={styles.optionWrapper}>
                          <TouchableOpacity
                            style={[
                              styles.optionItem,
                              isDarkMode && styles.optionItemDark,
                              isSelected && !showCorrect && styles.optionItemSelected,
                              isSelected && !showCorrect && isDarkMode && styles.optionItemSelectedDark,
                              showCorrect && styles.optionItemCorrect,
                            ]}
                            onPress={() => toggleSubOption(option.label, item)}
                            activeOpacity={0.7}>
                            <Text style={[
                              styles.optionLabel,
                              isDarkMode && styles.textDark,
                              showCorrect && styles.optionTextCorrect,
                            ]}>
                              {option.label}.
                            </Text>
                            <Text style={[
                              styles.optionContent,
                              isDarkMode && styles.textDark,
                              showCorrect && styles.optionTextCorrect,
                            ]}>
                              {option.content}
                            </Text>
                            {showCorrect && (
                              <Text style={styles.optionIcon}>✓</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {item.type === '主观题' && (
                  <TouchableOpacity
                    style={[styles.showAnswerButton, isDarkMode && styles.showAnswerButtonDark]}
                    onPress={() => setShowSubjectiveAnswer(!showSubjectiveAnswer)}
                    activeOpacity={0.7}>
                    <Text style={styles.showAnswerButtonText}>
                      {showSubjectiveAnswer ? '隐藏答案' : '显示答案'}
                    </Text>
                  </TouchableOpacity>
                )}



                {item.explain && (item.type !== '主观题' || showSubjectiveAnswer) && (
                  <View style={styles.questionSection}>
                    <RenderHTML
                      contentWidth={contentWidth}
                      source={{ html: "解析:" + item.explain }}
                      tagsStyles={explainStyle}
                    />
                  </View>
                )}

                {item.answer && (item.type !== '主观题' || showSubjectiveAnswer) && (
                  <View style={styles.questionSection}>

                    <RenderHTML
                      contentWidth={contentWidth}
                      source={{ html: "答案:" + item.answer }}
                      tagsStyles={answerStyle}
                    />
                  </View>
                )}
              </View>
            );
          })()}
        </ScrollView>
      </>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Toast 提示 */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            toastType === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity },
          ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* 题目内容区域 - 双层滚动 */}
      <View style={styles.contentWrapper}>
        <View style={[styles.questionCard, isDarkMode && styles.questionCardDark]}>
          {questionType === '客观题' ? renderObjectiveQuestion() : renderSubjectiveQuestion()}
        </View>
      </View>



      {/* 底部导航按钮 */}
      <View style={[styles.navigationBar, isDarkMode && styles.navigationBarDark]}>


        <TouchableOpacity
          style={[styles.headerBackButton, isDarkMode && styles.headerBackButtonDark]}
          onPress={onBack}>
          <Text style={styles.headerBackButtonText}>返回</Text>
        </TouchableOpacity>

        {questionType === '客观题' && currentQuestion && (
          <>
            <TouchableOpacity
              style={[styles.deleteButton, isDarkMode && styles.deleteButtonDark]}
              onPress={handleDeleteQuestion}>
              <Text style={styles.deleteButtonText}>删除</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.collectButton,
                currentQuestion.iscollect === '1' && styles.collectButtonActive,
                isDarkMode && styles.collectButtonDark,
              ]}
              onPress={handleToggleCollect}>
              <Text
                style={[
                  styles.collectButtonText,
                  currentQuestion.iscollect === '1' && styles.collectButtonTextActive,
                ]}>
                {currentQuestion.iscollect === '1' ? '已收藏' : '收藏'}
              </Text>
            </TouchableOpacity>


          </>
        )}
        {questionType === '主观题' && currentExamQuestion && currentExamItems.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.deleteButton, isDarkMode && styles.deleteButtonDark]}
              onPress={handleDeleteSubQuestion}>
              <Text style={styles.deleteButtonText}>删除</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[
            styles.navButton,
            isDarkMode && styles.navButtonDark,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevQuestion}
          disabled={currentIndex === 0}>
          <Text
            style={[
              styles.navButtonText,
              isDarkMode && styles.textDark,
              currentIndex === 0 && styles.navButtonTextDisabled,
            ]}>
            上一大题
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            isDarkMode && styles.navButtonDark,
            (questionType === '客观题' ? currentIndex >= questions.length - 1 : currentIndex >= examQuestions.length - 1) && styles.navButtonDisabled,
          ]}
          onPress={handleNextQuestion}
          disabled={questionType === '客观题' ? currentIndex >= questions.length - 1 : currentIndex >= examQuestions.length - 1}>
          <Text
            style={[
              styles.navButtonText,
              isDarkMode && styles.textDark,
              (questionType === '客观题' ? currentIndex >= questions.length - 1 : currentIndex >= examQuestions.length - 1) && styles.navButtonTextDisabled,
            ]}>
            下一大题
          </Text>
        </TouchableOpacity>

        {questionType === '主观题' && currentExamQuestion && currentExamItems.length > 0 && (
          <>
            <TouchableOpacity
              style={[
                styles.navButton,
                isDarkMode && styles.navButtonDark,
                currentSubIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={handlePrevSubQuestion}
              disabled={currentSubIndex === 0}>
              <Text
                style={[
                  styles.navButtonText,
                  isDarkMode && styles.textDark,
                  currentSubIndex === 0 && styles.navButtonTextDisabled,
                ]}>
                上一小题
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                isDarkMode && styles.navButtonDark,
                currentSubIndex >= currentExamItems.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNextSubQuestion}
              disabled={currentSubIndex >= currentExamItems.length - 1}>
              <Text
                style={[
                  styles.navButtonText,
                  isDarkMode && styles.textDark,
                  currentSubIndex >= currentExamItems.length - 1 && styles.navButtonTextDisabled,
                ]}>
                下一小题
              </Text>
            </TouchableOpacity>

          </>
        )}
      </View>
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
  headerBackButton: {
    minWidth: 60,
  },
  headerBackButtonDark: {},
  headerBackButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  toast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#d4edda',
  },
  toastError: {
    backgroundColor: '#f8d7da',
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  questionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  questionCardDark: {
    backgroundColor: '#1c1c1e',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  questionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionScrollView: {
    maxHeight: '30%',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  questionScrollContent: {
    paddingBottom: 8,
  },
  answersScrollView: {
    flex: 1,
  },
  answersScrollContent: {
  },
  htmlContainer: {
    marginBottom: 10,
  },
  questionSection: {
    marginTop: 10
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  optionsContainer: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    width: '48%',
  },
  deleteOptionButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteOptionButtonDark: {
    backgroundColor: '#ff453a',
  },
  deleteOptionButtonActive: {
    backgroundColor: '#34C759',
  },
  deleteOptionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    paddingVertical: 10,
  },
  deleteOptionButtonTextActive: {
    color: '#fff',
  },
  optionItem: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemDark: {
    backgroundColor: '#2c2c2e',
  },
  optionItemSelected: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  optionItemSelectedDark: {
    backgroundColor: '#4a1a1a',
    borderColor: '#ef5350',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  optionContent: {
    fontSize: 18,
    color: '#000',
    flex: 1,
  },
  optionItemCorrect: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  optionItemDisabled: {
    opacity: 0.3,
  },
  optionTextCorrect: {
    color: '#155724',
    fontWeight: '600' as const,
  },
  optionTextDeleted: {
    textDecorationLine: 'line-through' as const,
    color: '#999',
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginLeft: 8,
  },
  answerButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    display: 'flex',
  },
  answerButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  answerButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  answerButtonSelected: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  answerButtonSelectedDark: {
    backgroundColor: '#4a1a1a',
    borderColor: '#ef5350',
  },
  answerButtonCorrect: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  answerButtonDeleted: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    opacity: 0.3,
  },
  answerButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  answerButtonTextSelected: {
    color: '#f44336',
  },
  answerButtonTextCorrect: {
    color: '#155724',
    fontWeight: '700' as const,
  },
  answerButtonTextDeleted: {
    color: '#999',
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
    display: 'flex',
  },
  navigationBarDark: {
    backgroundColor: '#1c1c1e',
    borderTopColor: '#333',
  },
  navButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonDark: {
    backgroundColor: '#0A84FF',
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  navCenter: {
    flex: 1,
    marginTop: 10,
  },
  navCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonDark: {
    backgroundColor: '#ff453a',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  collectButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  collectButtonDark: {
    backgroundColor: '#636366',
  },
  collectButtonActive: {
    backgroundColor: '#FF9500',
  },
  collectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  collectButtonTextActive: {
    color: '#fff',
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
    marginBottom: 16,
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
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonDark: {
    backgroundColor: '#0A84FF',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subQuestionContainer: {
    marginBottom: 20,
  },
  subQuestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  subQuestionContent: {
    marginBottom: 12,
  },
  subjectiveInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  subjectiveInputDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#444',
    color: '#fff',
  },
  showAnswerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  showAnswerButtonDark: {
    backgroundColor: '#0A84FF',
  },
  showAnswerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

