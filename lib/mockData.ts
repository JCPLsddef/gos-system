/**
 * PREVIEW MODE MOCK DATA
 *
 * Datasets réalistes pour preview mode uniquement.
 * Permet de valider visuellement l'UI dans Bolt.new sans Supabase.
 *
 * IMPORTANT: Ces données ne sont JAMAIS utilisées en production.
 */

import { addDays, addHours, startOfWeek, setHours } from 'date-fns';

const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 });

// BATTLEFRONTS
export const mockBattlefronts = [
  {
    id: 'bf-1',
    name: 'Health & Fitness Domination',
    description: 'Transform physique and build unbreakable discipline',
    status: 'active',
    user_id: 'preview-user',
    created_at: addDays(now, -30).toISOString(),
    updated_at: now.toISOString(),
    priority: 1,
  },
  {
    id: 'bf-2',
    name: 'Business Empire Expansion',
    description: 'Scale revenue, automate systems, dominate market',
    status: 'active',
    user_id: 'preview-user',
    created_at: addDays(now, -25).toISOString(),
    updated_at: now.toISOString(),
    priority: 2,
  },
  {
    id: 'bf-3',
    name: 'Technical Mastery Campaign',
    description: 'Master advanced programming, architecture, and deployment',
    status: 'active',
    user_id: 'preview-user',
    created_at: addDays(now, -20).toISOString(),
    updated_at: now.toISOString(),
    priority: 3,
  },
  {
    id: 'bf-4',
    name: 'Financial Freedom Operation',
    description: 'Build passive income streams and wealth systems',
    status: 'paused',
    user_id: 'preview-user',
    created_at: addDays(now, -15).toISOString(),
    updated_at: now.toISOString(),
    priority: 4,
  },
  {
    id: 'bf-5',
    name: 'Personal Brand Conquest',
    description: 'Establish authority, grow audience, create influence',
    status: 'active',
    user_id: 'preview-user',
    created_at: addDays(now, -10).toISOString(),
    updated_at: now.toISOString(),
    priority: 5,
  },
];

// MISSIONS
export const mockMissions = [
  {
    id: 'm-1',
    user_id: 'preview-user',
    title: 'Morning Workout - Push Day',
    description: 'Chest, shoulders, triceps. 60 min high intensity.',
    battlefront_id: 'bf-1',
    start_at: setHours(addDays(weekStart, 0), 6).toISOString(),
    end_at: setHours(addDays(weekStart, 0), 7).toISOString(),
    completed_at: null,
    created_at: addDays(now, -5).toISOString(),
    priority: 'high',
    battlefront: mockBattlefronts[0],
  },
  {
    id: 'm-2',
    user_id: 'preview-user',
    title: 'Client Strategy Call',
    description: 'Q1 roadmap review and revenue projections',
    battlefront_id: 'bf-2',
    start_at: setHours(addDays(weekStart, 0), 10).toISOString(),
    end_at: setHours(addDays(weekStart, 0), 11).toISOString(),
    completed_at: null,
    created_at: addDays(now, -4).toISOString(),
    priority: 'critical',
    battlefront: mockBattlefronts[1],
  },
  {
    id: 'm-3',
    user_id: 'preview-user',
    title: 'Deep Work: System Architecture',
    description: 'Design microservices architecture for new platform',
    battlefront_id: 'bf-3',
    start_at: setHours(addDays(weekStart, 0), 14).toISOString(),
    end_at: setHours(addDays(weekStart, 0), 17).toISOString(),
    completed_at: null,
    created_at: addDays(now, -3).toISOString(),
    priority: 'high',
    battlefront: mockBattlefronts[2],
  },
  {
    id: 'm-4',
    user_id: 'preview-user',
    title: 'Evening Cardio Session',
    description: '30 min HIIT + stretching',
    battlefront_id: 'bf-1',
    start_at: setHours(addDays(weekStart, 1), 18).toISOString(),
    end_at: setHours(addDays(weekStart, 1), 19).toISOString(),
    completed_at: null,
    created_at: addDays(now, -2).toISOString(),
    priority: 'medium',
    battlefront: mockBattlefronts[0],
  },
  {
    id: 'm-5',
    user_id: 'preview-user',
    title: 'Content Creation Sprint',
    description: 'Record 3 YouTube videos, edit thumbnails',
    battlefront_id: 'bf-5',
    start_at: setHours(addDays(weekStart, 2), 9).toISOString(),
    end_at: setHours(addDays(weekStart, 2), 12).toISOString(),
    completed_at: null,
    created_at: addDays(now, -1).toISOString(),
    priority: 'high',
    battlefront: mockBattlefronts[4],
  },
  {
    id: 'm-6',
    user_id: 'preview-user',
    title: 'Investment Portfolio Review',
    description: 'Analyze Q4 performance, rebalance allocations',
    battlefront_id: 'bf-4',
    start_at: setHours(addDays(weekStart, 3), 15).toISOString(),
    end_at: setHours(addDays(weekStart, 3), 16).toISOString(),
    completed_at: null,
    created_at: now.toISOString(),
    priority: 'medium',
    battlefront: mockBattlefronts[3],
  },
  {
    id: 'm-7',
    user_id: 'preview-user',
    title: 'Leg Day Destruction',
    description: 'Squats, deadlifts, lunges. Go heavy.',
    battlefront_id: 'bf-1',
    start_at: setHours(addDays(weekStart, 4), 6).toISOString(),
    end_at: setHours(addDays(weekStart, 4), 7).toISOString(),
    completed_at: null,
    created_at: now.toISOString(),
    priority: 'high',
    battlefront: mockBattlefronts[0],
  },
  {
    id: 'm-8',
    user_id: 'preview-user',
    title: 'Sales Team Training',
    description: 'New CRM onboarding and pipeline management',
    battlefront_id: 'bf-2',
    start_at: setHours(addDays(weekStart, 5), 13).toISOString(),
    end_at: setHours(addDays(weekStart, 5), 15).toISOString(),
    completed_at: null,
    created_at: now.toISOString(),
    priority: 'medium',
    battlefront: mockBattlefronts[1],
  },
];

// CALENDAR EVENTS
export const mockCalendarEvents = [
  {
    id: 'ev-1',
    user_id: 'preview-user',
    title: 'Morning Workout - Push Day',
    description: 'Chest, shoulders, triceps. 60 min high intensity.',
    start_time: setHours(addDays(weekStart, 0), 6).toISOString(),
    end_time: setHours(addDays(weekStart, 0), 7).toISOString(),
    mission_id: 'm-1',
    created_at: addDays(now, -5).toISOString(),
  },
  {
    id: 'ev-2',
    user_id: 'preview-user',
    title: 'Client Strategy Call',
    description: 'Q1 roadmap review and revenue projections',
    start_time: setHours(addDays(weekStart, 0), 10).toISOString(),
    end_time: setHours(addDays(weekStart, 0), 11).toISOString(),
    mission_id: 'm-2',
    created_at: addDays(now, -4).toISOString(),
  },
  {
    id: 'ev-3',
    user_id: 'preview-user',
    title: 'Deep Work: System Architecture',
    description: 'Design microservices architecture',
    start_time: setHours(addDays(weekStart, 0), 14).toISOString(),
    end_time: setHours(addDays(weekStart, 0), 17).toISOString(),
    mission_id: 'm-3',
    created_at: addDays(now, -3).toISOString(),
  },
  {
    id: 'ev-4',
    user_id: 'preview-user',
    title: 'Evening Cardio Session',
    description: '30 min HIIT + stretching',
    start_time: setHours(addDays(weekStart, 1), 18).toISOString(),
    end_time: setHours(addDays(weekStart, 1), 19).toISOString(),
    mission_id: 'm-4',
    created_at: addDays(now, -2).toISOString(),
  },
  {
    id: 'ev-5',
    user_id: 'preview-user',
    title: 'Team Standup',
    description: 'Daily sync with engineering team',
    start_time: setHours(addDays(weekStart, 1), 9).toISOString(),
    end_time: setHours(addDays(weekStart, 1), 9.5).toISOString(),
    mission_id: null,
    created_at: addDays(now, -1).toISOString(),
  },
  {
    id: 'ev-6',
    user_id: 'preview-user',
    title: 'Content Creation Sprint',
    description: 'Record 3 YouTube videos',
    start_time: setHours(addDays(weekStart, 2), 9).toISOString(),
    end_time: setHours(addDays(weekStart, 2), 12).toISOString(),
    mission_id: 'm-5',
    created_at: now.toISOString(),
  },
  {
    id: 'ev-7',
    user_id: 'preview-user',
    title: 'Lunch Break',
    description: 'Meal prep + rest',
    start_time: setHours(addDays(weekStart, 2), 12).toISOString(),
    end_time: setHours(addDays(weekStart, 2), 13).toISOString(),
    mission_id: null,
    created_at: now.toISOString(),
  },
  {
    id: 'ev-8',
    user_id: 'preview-user',
    title: 'Investment Portfolio Review',
    description: 'Analyze Q4 performance',
    start_time: setHours(addDays(weekStart, 3), 15).toISOString(),
    end_time: setHours(addDays(weekStart, 3), 16).toISOString(),
    mission_id: 'm-6',
    created_at: now.toISOString(),
  },
  {
    id: 'ev-9',
    user_id: 'preview-user',
    title: 'Leg Day Destruction',
    description: 'Squats, deadlifts, lunges',
    start_time: setHours(addDays(weekStart, 4), 6).toISOString(),
    end_time: setHours(addDays(weekStart, 4), 7).toISOString(),
    mission_id: 'm-7',
    created_at: now.toISOString(),
  },
  {
    id: 'ev-10',
    user_id: 'preview-user',
    title: 'Sales Team Training',
    description: 'CRM onboarding',
    start_time: setHours(addDays(weekStart, 5), 13).toISOString(),
    end_time: setHours(addDays(weekStart, 5), 15).toISOString(),
    mission_id: 'm-8',
    created_at: now.toISOString(),
  },
  {
    id: 'ev-11',
    user_id: 'preview-user',
    title: 'Code Review Session',
    description: 'Review PRs and provide feedback',
    start_time: setHours(addDays(weekStart, 5), 16).toISOString(),
    end_time: setHours(addDays(weekStart, 5), 17).toISOString(),
    mission_id: null,
    created_at: now.toISOString(),
  },
];

// NOTIFICATIONS
export const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'preview-user',
    title: 'Mission Starting Soon',
    message: 'Morning Workout - Push Day starts in 15 minutes',
    read: false,
    created_at: addHours(now, -1).toISOString(),
    mission_id: 'm-1',
  },
  {
    id: 'notif-2',
    user_id: 'preview-user',
    title: 'Battlefront Update',
    message: 'Health & Fitness Domination progress: 75% complete',
    read: false,
    created_at: addHours(now, -3).toISOString(),
    mission_id: null,
  },
  {
    id: 'notif-3',
    user_id: 'preview-user',
    title: 'Mission Completed',
    message: 'Deep Work: System Architecture marked as complete',
    read: true,
    created_at: addDays(now, -1).toISOString(),
    mission_id: 'm-3',
  },
];

// USER SETTINGS
export const mockUserSettings = {
  user_id: 'preview-user',
  grand_strategy: `# Grand Strategy 2024

## Vision
Build an empire of automated systems that generate wealth, impact, and freedom.

## Core Objectives
1. Scale business to $10M ARR
2. Achieve peak physical condition (sub-10% BF, 225lb lean)
3. Master advanced system architecture and AI
4. Build personal brand to 100K+ followers
5. Create passive income streams ($50K/month)

## Operating Principles
- Deep work over shallow tasks
- Compound daily progress
- Systems thinking always
- Execute with precision
- Never compromise on quality`,
  created_at: addDays(now, -90).toISOString(),
  updated_at: now.toISOString(),
};
