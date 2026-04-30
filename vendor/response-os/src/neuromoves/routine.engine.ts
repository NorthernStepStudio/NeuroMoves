import type { Routine, RoutineStep } from '../core/types.js';
import { routineTemplates, type ActivityTemplate } from './routine.templates.js';

export interface RoutineRequest {
  ageRange: string;
  goals: string[];
  timeAvailable: number;
  preferences?: {
    likes?: string[];
    dislikes?: string[];
  };
}

const FALLBACK_STEP: RoutineStep = {
  activity: 'Gentle Stretching',
  time: '2 mins',
  instructions: 'Slowly reach for your toes and then the sky.',
  difficulty: 'easy',
};

export class RoutineEngine {
  generateRoutine(request: RoutineRequest): Routine {
    const age = this.parseAgeRange(request.ageRange);
    const goals = normalizeWords(request.goals);
    const likes = normalizeWords(request.preferences?.likes ?? []);
    const dislikes = normalizeWords(request.preferences?.dislikes ?? []);
    const timeLimit = normalizeTime(request.timeAvailable);

    const rankedPool = routineTemplates
      .filter((template) => this.isAgeCompatible(template, age.min, age.max))
      .filter((template) => goals.length === 0 || goals.some((goal) => template.tags.includes(goal)))
      .filter((template) => !dislikes.some((d) => template.activity.toLowerCase().includes(d)))
      .map((template) => ({
        template,
        score: this.scoreTemplate(template, goals, likes),
      }))
      .sort((a, b) => b.score - a.score || a.template.activity.localeCompare(b.template.activity))
      .map((entry) => entry.template);

    const steps = this.selectStepsWithinTime(rankedPool, timeLimit);
    const finalSteps = steps.length > 0 ? steps : [FALLBACK_STEP];
    const duration = finalSteps.reduce((total, step) => total + parseMinutes(step.time), 0);

    return {
      title: this.buildTitle(goals),
      duration: `${duration} mins`,
      steps: finalSteps,
      safetyNote: 'Ensure a clear space and adult supervision during all activities.',
      disclaimer: 'Not medical advice.',
    };
  }

  private parseAgeRange(ageRange: string): { min: number; max: number } {
    const match = ageRange.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (!match) {
      throw new Error(`Invalid ageRange "${ageRange}". Expected format "min-max".`);
    }

    const min = Number.parseInt(match[1], 10);
    const max = Number.parseInt(match[2], 10);
    if (min > max) {
      throw new Error(`Invalid ageRange "${ageRange}". Minimum age cannot exceed maximum age.`);
    }

    return { min, max };
  }

  private isAgeCompatible(template: ActivityTemplate, minAge: number, maxAge: number): boolean {
    return template.minAge <= maxAge && template.maxAge >= minAge;
  }

  private scoreTemplate(template: ActivityTemplate, goals: string[], likes: string[]): number {
    const goalScore = goals.filter((goal) => template.tags.includes(goal)).length * 5;
    const likeScore = likes.filter((like) => template.activity.toLowerCase().includes(like)).length * 2;
    return goalScore + likeScore;
  }

  private selectStepsWithinTime(templates: ActivityTemplate[], timeLimit: number): RoutineStep[] {
    const steps: RoutineStep[] = [];
    let elapsed = 0;

    for (const template of templates) {
      const minutes = parseMinutes(template.time);
      if (elapsed + minutes > timeLimit) continue;
      steps.push({
        activity: template.activity,
        time: template.time,
        instructions: template.instructions,
        difficulty: template.difficulty,
      });
      elapsed += minutes;
    }

    return steps;
  }

  private buildTitle(goals: string[]): string {
    if (goals.length === 0) return 'Personalized Daily Routine';
    return `Personalized ${goals.join(' & ')} Routine`;
  }
}

function normalizeWords(words: string[]): string[] {
  return words
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0);
}

function normalizeTime(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 1;
  return Math.max(1, Math.trunc(minutes));
}

function parseMinutes(value: string): number {
  const match = value.match(/(\d+)/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10);
}
