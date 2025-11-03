declare module 'react-native' {
  interface NativeModulesStatic {
    StudentDatabaseModule: {
      getAllStudents(): Promise<Array<Record<string, any>>>;
      insertStudent(name: string): Promise<number>;
      getQuestions(page: number, pageSize: number): Promise<Array<Record<string, any>>>;
      getTotalQuestions(): Promise<number>;
      getAllSubjects(): Promise<Array<Record<string, any>>>;
      getQuestionsBySubject(subjectId: number): Promise<Array<Record<string, any>>>;
      deleteQuestion(questionId: number): Promise<boolean>;
      updateQuestionCollectStatus(questionId: number, collectStatus: string): Promise<boolean>;
      getCollectedQuestionsBySubject(subjectId: number): Promise<Array<Record<string, any>>>;
      getExamQuestionsBySubject(subjectId: number): Promise<Array<Record<string, any>>>;
      getExamItemsByQuestionId(questionId: number): Promise<Array<Record<string, any>>>;
    };
  }
}

export {};

