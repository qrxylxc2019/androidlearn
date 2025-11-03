export interface Question {
  id: number;
  question: string;
  questiontype: string;
  items: string;
  answer: string;
  explain: string;
  subjectid: number;
  relatedid: number;
  comment: string;
  iscollect: string;
  [key: string]: any;
}

export interface ExamQuestion {
  id: number;
  question: string;
  subjectid: number;
  [key: string]: any;
}

export interface ExamItem {
  id: number;
  qid: number;
  type: string;
  answer: string;
  items: string;
  explain: string;
  [key: string]: any;
}

export interface SubQuestion {
  index: number;
  type: string;
  material: string;
  options?: string;
  answer: string;
  explain?: string;
}

export interface Subject {
  id: number;
  name: string;
  [key: string]: any;
}

export interface Option {
  label: string;
  content: string;
}

