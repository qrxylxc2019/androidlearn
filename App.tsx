/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import RouteSelection from './views/RouteSelection';
import SubjectList from './views/SubjectList';
import CollectSubject from './views/CollectSubject';
import Learn from './views/Learn';
import { Subject } from './types';

type ViewMode = 'route' | 'practice' | 'collection' | 'learn';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('route');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[] | null>(null);
  const [isCollectionMode, setIsCollectionMode] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [repeatCount, setRepeatCount] = useState<number>(5);
  const [questionType, setQuestionType] = useState<string>('客观题');

  const handleSelectRoute = (route: 'practice' | 'collection') => {
    if (route === 'practice') {
      setViewMode('practice');
      setIsCollectionMode(false);
    } else {
      setViewMode('collection');
      setIsCollectionMode(true);
    }
  };

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedSubjectIds(null);
    setViewMode('learn');
  };

  const handleStartMultiSubjectLearn = (subjectIds: number[], qCount: number, rCount: number, qType: string) => {
    setSelectedSubjectIds(subjectIds);
    setSelectedSubject(null);
    setQuestionCount(qCount);
    setRepeatCount(rCount);
    setQuestionType(qType);
    setViewMode('learn');
  };

  const handleBackToSubjects = () => {
    if (isCollectionMode) {
      setViewMode('collection');
    } else {
      setViewMode('practice');
    }
    setSelectedSubject(null);
    setSelectedSubjectIds(null);
  };

  const handleBackToRoute = () => {
    setViewMode('route');
    setSelectedSubject(null);
    setSelectedSubjectIds(null);
    setIsCollectionMode(false);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: safeAreaInsets.top },
        isDarkMode && styles.containerDark,
      ]}>
      {viewMode === 'route' && (
        <RouteSelection onSelectRoute={handleSelectRoute} />
      )}
      {viewMode === 'practice' && (
        <SubjectList 
          onSelectSubject={handleSelectSubject}
          onStartMultiSubjectLearn={handleStartMultiSubjectLearn}
          onBack={handleBackToRoute}
        />
      )}
      {viewMode === 'collection' && (
        <CollectSubject 
          onSelectSubject={handleSelectSubject}
          onBack={handleBackToRoute}
        />
      )}
      {viewMode === 'learn' && (
        <Learn 
          subject={selectedSubject || undefined} 
          subjectIds={selectedSubjectIds || undefined}
          questionCount={questionCount}
          repeatCount={repeatCount}
          onBack={handleBackToSubjects}
          isCollectionMode={isCollectionMode}
          questionType={questionType}
        />
      )}
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
});

export default App;
