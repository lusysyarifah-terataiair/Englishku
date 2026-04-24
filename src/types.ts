/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SkillType = 'reading' | 'writing' | 'listening' | 'speaking';

export interface UserProgress {
  level: string; // A1, A2, B1, B2, C1, C2
  streak: number;
  lastCompletedDate?: string;
  skillScores: {
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
  };
  history: Array<{
    date: string;
    skill: SkillType;
    score: number;
    type: 'stimulation' | 'assessment';
  }>;
}

export interface DailyExercise {
  id: string;
  skill: SkillType;
  title: string;
  content: string;
  questions?: Array<{
    text: string;
    options: string[];
    correctAnswer: string;
  }>;
  instruction: string;
}

export interface AssessmentResult {
  overallLevel: string;
  feedback: string;
  scores: {
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
  };
  recommendedNextSteps: string[];
}
