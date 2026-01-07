import { GosActions } from './actions';
import {
  getConversationState,
  setConversationState,
  clearConversationState,
  updateConversationContext,
} from './conversation-state';
import { SupabaseClient } from '@supabase/supabase-js';

type OrchestratorResult = {
  message: string;
  actionExecuted?: boolean;
};

export class ChatOrchestrator {
  private actions: GosActions;
  private userId: string;

  constructor(supabaseClient: SupabaseClient, userId: string) {
    this.userId = userId;
    this.actions = new GosActions(supabaseClient, userId);
  }

  async getContextForLLM(): Promise<string> {
    try {
      const [battlefrontsRes, missionsRes, statsRes] = await Promise.all([
        this.actions.getBattlefronts(),
        this.actions.getMissions({ status: 'NOT_DONE' }),
        this.actions.getSystemStats(),
      ]);

      const battlefronts = battlefrontsRes.data || [];
      const missions = missionsRes.data || [];
      const stats = statsRes.data;

      const contextParts = [];

      if (battlefronts.length > 0) {
        const bfList = battlefronts
          .map((bf: any) => `- ${bf.name} (${bf.status})`)
          .join('\n');
        contextParts.push(`Current Battlefronts:\n${bfList}`);
      }

      if (missions.length > 0) {
        const missionList = missions
          .slice(0, 5)
          .map((m: any) => {
            const bf = Array.isArray(m.battlefront) ? m.battlefront[0] : m.battlefront;
            return `- ${m.title} (${bf?.name}) - Due: ${new Date(m.due_date).toLocaleDateString()}`;
          })
          .join('\n');
        contextParts.push(`Active Missions (next 5):\n${missionList}`);
      }

      if (stats) {
        contextParts.push(
          `Stats: ${stats.battlefronts.total} battlefronts, ${stats.missions.notDone} active missions, ${stats.missions.done} completed`
        );
      }

      return contextParts.join('\n\n');
    } catch (error) {
      return '';
    }
  }

  async processMessage(userMessage: string): Promise<OrchestratorResult> {
    const state = getConversationState(this.userId);

    if (state.flow) {
      return this.continueFlow(userMessage, state);
    }

    const intent = this.detectIntent(userMessage);

    switch (intent) {
      case 'create_battlefront':
        return this.startBattlefrontCreation(userMessage);
      case 'update_battlefront':
        return this.startBattlefrontUpdate(userMessage);
      case 'delete_battlefront':
        return this.startBattlefrontDeletion(userMessage);
      case 'list_battlefronts':
        return this.listBattlefronts();

      case 'create_checkpoint':
        return this.startCheckpointCreation(userMessage);
      case 'toggle_checkpoint':
        return this.startCheckpointToggle(userMessage);
      case 'delete_checkpoint':
        return this.startCheckpointDeletion(userMessage);

      case 'create_mission':
        return this.startMissionCreation(userMessage);
      case 'update_mission':
        return this.startMissionUpdate(userMessage);
      case 'delete_mission':
        return this.startMissionDeletion(userMessage);
      case 'mark_mission_done':
        return this.startMissionMarkDone(userMessage);
      case 'list_missions':
        return this.listMissions();

      case 'schedule_mission':
        return this.startMissionScheduling(userMessage);
      case 'reschedule_event':
        return this.startEventReschedule(userMessage);
      case 'unschedule_event':
        return this.startEventUnschedule(userMessage);

      case 'plan_day':
        return this.planDay();
      case 'plan_week':
        return this.planWeek();
      case 'run_ooda':
        return this.runOODA();

      case 'system_status':
        return this.getSystemStatus();

      default:
        return { message: this.getDefaultResponse() };
    }
  }

  private detectIntent(message: string): string {
    const lower = message.toLowerCase();

    if (/create|add|new.*battlefront/i.test(message)) return 'create_battlefront';
    if (/update|change|modify.*battlefront/i.test(message)) return 'update_battlefront';
    if (/delete|remove.*battlefront/i.test(message)) return 'delete_battlefront';
    if (/list|show.*battlefront/i.test(message)) return 'list_battlefronts';

    if (/create|add.*checkpoint/i.test(message)) return 'create_checkpoint';
    if (/(?:toggle|mark|check|complete).*checkpoint/i.test(message)) return 'toggle_checkpoint';
    if (/delete|remove.*checkpoint/i.test(message)) return 'delete_checkpoint';

    if (/(create|add|make|schedule).*(mission|task)/i.test(message)) return 'create_mission';
    if (/update|change|modify.*mission/i.test(message)) return 'update_mission';
    if (/delete|remove.*mission/i.test(message)) return 'delete_mission';
    if (/(?:mark|complete|finish|done).*mission/i.test(message)) return 'mark_mission_done';
    if (/list|show.*mission/i.test(message)) return 'list_missions';

    if (/schedule|calendar|time.*block/i.test(message) && /mission|task/i.test(message))
      return 'schedule_mission';
    if (/reschedule|move.*(?:event|meeting|block)/i.test(message)) return 'reschedule_event';
    if (/(?:unschedule|remove|cancel).*(?:event|meeting|block)/i.test(message))
      return 'unschedule_event';

    if (/plan.*(?:day|today)/i.test(message)) return 'plan_day';
    if (/plan.*(?:week|this week)/i.test(message)) return 'plan_week';
    if (/ooda|review|sunday/i.test(message)) return 'run_ooda';

    if (/status|stats|overview|situation/i.test(message)) return 'system_status';

    return 'unknown';
  }

  private async continueFlow(userMessage: string, state: any): Promise<OrchestratorResult> {
    const flowHandlers: Record<string, (msg: string, state: any) => Promise<OrchestratorResult>> = {
      battlefront_creation: this.continueBattlefrontCreation.bind(this),
      mission_creation: this.continueMissionCreation.bind(this),
      checkpoint_creation: this.continueCheckpointCreation.bind(this),
    };

    const handler = flowHandlers[state.flow];
    if (handler) {
      return handler(userMessage, state);
    }

    clearConversationState(this.userId);
    return { message: 'Flow interrupted. What do you need?' };
  }

  private async startBattlefrontCreation(userMessage: string): Promise<OrchestratorResult> {
    setConversationState(this.userId, {
      flow: 'battlefront_creation',
      step: 1,
      context: {},
    });

    return {
      message: `Battlefront name?`,
    };
  }

  private async continueBattlefrontCreation(
    userMessage: string,
    state: any
  ): Promise<OrchestratorResult> {
    const { step, context } = state;

    if (step === 1) {
      updateConversationContext(this.userId, { name: userMessage.trim() });
      setConversationState(this.userId, { ...state, step: 2 });
      return { message: `Binary victory condition? (measurable outcome)` };
    }

    if (step === 2) {
      updateConversationContext(this.userId, { binaryExitTarget: userMessage.trim() });
      setConversationState(this.userId, { ...state, step: 3 });
      return { message: `Time horizon? (short/medium/long or days/weeks/months)` };
    }

    if (step === 3) {
      updateConversationContext(this.userId, { timeHorizon: userMessage.trim() });
      setConversationState(this.userId, { ...state, step: 4 });
      return { message: `Weekly time commitment? (hours per week)` };
    }

    if (step === 4) {
      updateConversationContext(this.userId, { weeklyTime: userMessage.trim() });
      setConversationState(this.userId, { ...state, step: 5 });
      return { message: `Priority level? (1=critical, 5=low)` };
    }

    if (step === 5) {
      updateConversationContext(this.userId, { priority: userMessage.trim() });

      const finalContext = getConversationState(this.userId).context!;

      const battlefrontResult = await this.actions.createBattlefront({
        name: finalContext.name,
        binaryExitTarget: finalContext.binaryExitTarget,
        status: 'ACTIVE',
      });

      if (!battlefrontResult.success) {
        clearConversationState(this.userId);
        return { message: `Failed: ${battlefrontResult.error}` };
      }

      const battlefront = battlefrontResult.data;

      const autoMissions = this.generateAutoMissions(
        finalContext.name,
        finalContext.binaryExitTarget,
        finalContext.timeHorizon
      );

      let createdCount = 0;
      for (const mission of autoMissions) {
        const missionResult = await this.actions.createMission({
          battlefrontId: battlefront.id,
          title: mission.title,
          attackDate: mission.attackDate.toISOString(),
          dueDate: mission.dueDate.toISOString(),
          durationMinutes: mission.duration,
        });

        if (missionResult.success) {
          createdCount++;

          for (const checkpoint of mission.checkpoints) {
            await this.actions.createCheckpoint({
              battlefrontId: battlefront.id,
              title: checkpoint,
            });
          }
        }
      }

      clearConversationState(this.userId);

      return {
        message: `✓ Battlefront created: ${finalContext.name}
✓ Binary exit: ${finalContext.binaryExitTarget}
✓ Auto-generated ${createdCount} missions
✓ Auto-generated ${createdCount * 3} checkpoints

Battlefront operational. Check War Map.`,
        actionExecuted: true,
      };
    }

    clearConversationState(this.userId);
    return { message: 'Flow error.' };
  }

  private generateAutoMissions(
    battlefrontName: string,
    binaryExit: string,
    timeHorizon: string
  ): Array<{ title: string; attackDate: Date; dueDate: Date; duration: number; checkpoints: string[] }> {
    const now = new Date();
    const isShortTerm = /short|week|days/i.test(timeHorizon);
    const missions = [];

    if (isShortTerm) {
      const week1 = new Date(now);
      week1.setDate(week1.getDate() + 7);
      missions.push({
        title: `Initial planning & research for ${battlefrontName}`,
        attackDate: new Date(now),
        dueDate: week1,
        duration: 120,
        checkpoints: [
          'Define key milestones',
          'Identify required resources',
          'Create execution timeline',
        ],
      });

      const week2 = new Date(now);
      week2.setDate(week2.getDate() + 14);
      missions.push({
        title: `Execute first milestone toward ${binaryExit}`,
        attackDate: week1,
        dueDate: week2,
        duration: 180,
        checkpoints: [
          'Complete primary deliverable',
          'Test initial approach',
          'Document learnings',
        ],
      });

      const week3 = new Date(now);
      week3.setDate(week3.getDate() + 21);
      missions.push({
        title: `Iterate and refine approach`,
        attackDate: week2,
        dueDate: week3,
        duration: 120,
        checkpoints: [
          'Analyze first results',
          'Adjust strategy',
          'Execute refinements',
        ],
      });
    } else {
      const month1 = new Date(now);
      month1.setMonth(month1.getMonth() + 1);
      missions.push({
        title: `Foundation phase: ${battlefrontName}`,
        attackDate: new Date(now),
        dueDate: month1,
        duration: 240,
        checkpoints: [
          'Establish core infrastructure',
          'Build foundational skills',
          'Set up tracking systems',
        ],
      });

      const month2 = new Date(now);
      month2.setMonth(month2.getMonth() + 2);
      missions.push({
        title: `Growth phase: advance toward ${binaryExit}`,
        attackDate: month1,
        dueDate: month2,
        duration: 300,
        checkpoints: [
          'Scale up operations',
          'Hit first major milestone',
          'Build momentum',
        ],
      });

      const month3 = new Date(now);
      month3.setMonth(month3.getMonth() + 3);
      missions.push({
        title: `Acceleration phase: final push`,
        attackDate: month2,
        dueDate: month3,
        duration: 240,
        checkpoints: [
          'Execute critical path',
          'Eliminate blockers',
          'Achieve binary exit',
        ],
      });
    }

    return missions;
  }

  private async startMissionCreation(userMessage: string): Promise<OrchestratorResult> {
    const battlefrontsResult = await this.actions.getBattlefronts();

    if (!battlefrontsResult.success || !battlefrontsResult.data?.length) {
      return {
        message: `No battlefronts exist. Create one first.`,
      };
    }

    const title = this.extractTitle(userMessage);
    const durationMinutes = this.extractDuration(userMessage) || 60;
    const dueDate = this.extractDueDate(userMessage);
    const attackDate = this.extractAttackDate(userMessage);

    if (title && dueDate && attackDate) {
      return this.executeMissionCreation({
        title,
        durationMinutes,
        dueDate,
        attackDate,
        battlefronts: battlefrontsResult.data,
        userMessage,
      });
    }

    const missingInfo = [];
    if (!title) missingInfo.push('mission title');
    if (!dueDate) missingInfo.push('due date');
    if (!attackDate) missingInfo.push('attack date');

    setConversationState(this.userId, {
      flow: 'mission_creation',
      step: 1,
      context: {
        title,
        durationMinutes,
        dueDate,
        attackDate,
        battlefronts: battlefrontsResult.data,
        missingInfo,
      },
    });

    return {
      message: `Missing: ${missingInfo.join(', ')}. Provide them.`,
    };
  }

  private async continueMissionCreation(
    userMessage: string,
    state: any
  ): Promise<OrchestratorResult> {
    const { context } = state;

    const title = context.title || this.extractTitle(userMessage);
    const durationMinutes = context.durationMinutes || this.extractDuration(userMessage) || 60;
    const dueDate = context.dueDate || this.extractDueDate(userMessage);
    const attackDate = context.attackDate || this.extractAttackDate(userMessage) || dueDate;

    if (!title || !dueDate) {
      const missing = [];
      if (!title) missing.push('title');
      if (!dueDate) missing.push('due date');
      return { message: `Still need: ${missing.join(', ')}` };
    }

    return this.executeMissionCreation({
      title,
      durationMinutes,
      dueDate,
      attackDate,
      battlefronts: context.battlefronts,
      userMessage,
    });
  }

  private async executeMissionCreation(data: {
    title: string;
    durationMinutes: number;
    dueDate: Date;
    attackDate: Date;
    battlefronts: any[];
    userMessage: string;
  }): Promise<OrchestratorResult> {
    const battlefront = data.battlefronts[0];

    const missionResult = await this.actions.createMission({
      battlefrontId: battlefront.id,
      title: data.title,
      attackDate: data.attackDate.toISOString(),
      dueDate: data.dueDate.toISOString(),
      durationMinutes: data.durationMinutes,
    });

    if (!missionResult.success) {
      clearConversationState(this.userId);
      return { message: `Failed: ${missionResult.error}` };
    }

    const shouldSchedule =
      data.userMessage.toLowerCase().includes('schedule') ||
      data.userMessage.toLowerCase().includes('at ') ||
      data.userMessage.toLowerCase().includes('tomorrow') ||
      data.userMessage.toLowerCase().includes('today');

    if (shouldSchedule) {
      const startTime = this.extractStartTime(data.userMessage, data.attackDate);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + data.durationMinutes);

      await this.actions.scheduleMission({
        missionId: missionResult.data.id,
        battlefrontId: battlefront.id,
        title: data.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      clearConversationState(this.userId);

      return {
        message: `✓ Mission: ${data.title}
✓ Scheduled: ${this.formatDateTime(startTime)}
✓ Duration: ${data.durationMinutes}min
✓ Due: ${this.formatDateTime(data.dueDate)}

Calendar updated.`,
        actionExecuted: true,
      };
    }

    clearConversationState(this.userId);

    return {
      message: `✓ Mission: ${data.title}
✓ Front: ${battlefront.name}
✓ Due: ${this.formatDateTime(data.dueDate)}

Not scheduled. Add time block if needed.`,
      actionExecuted: true,
    };
  }

  private async startCheckpointCreation(userMessage: string): Promise<OrchestratorResult> {
    const battlefrontsResult = await this.actions.getBattlefronts();

    if (!battlefrontsResult.success || !battlefrontsResult.data?.length) {
      return { message: `No battlefronts. Create one first.` };
    }

    setConversationState(this.userId, {
      flow: 'checkpoint_creation',
      step: 1,
      context: { battlefronts: battlefrontsResult.data },
    });

    const battlefrontList = battlefrontsResult.data
      .map((bf: any, i: number) => `${i + 1}. ${bf.name}`)
      .join('\n');

    return {
      message: `Which battlefront?\n\n${battlefrontList}`,
    };
  }

  private async continueCheckpointCreation(
    userMessage: string,
    state: any
  ): Promise<OrchestratorResult> {
    const { step, context } = state;

    if (step === 1) {
      const battlefront = this.selectBattlefront(userMessage, context.battlefronts);

      if (!battlefront) {
        return { message: `Not found. Use exact name or number.` };
      }

      updateConversationContext(this.userId, { selectedBattlefront: battlefront });
      setConversationState(this.userId, { ...state, step: 2 });

      return { message: `Checkpoint title?` };
    }

    if (step === 2) {
      const title = userMessage.trim();
      const battlefront = context.selectedBattlefront;

      const result = await this.actions.createCheckpoint({
        battlefrontId: battlefront.id,
        title,
      });

      clearConversationState(this.userId);

      if (result.success) {
        return {
          message: `✓ Checkpoint: ${title}\n✓ Front: ${battlefront.name}`,
          actionExecuted: true,
        };
      } else {
        return { message: `Failed: ${result.error}` };
      }
    }

    clearConversationState(this.userId);
    return { message: 'Flow error.' };
  }

  private async listBattlefronts(): Promise<OrchestratorResult> {
    const result = await this.actions.getBattlefronts();

    if (!result.success) {
      return { message: `Error: ${result.error}` };
    }

    if (!result.data || result.data.length === 0) {
      return { message: `No battlefronts. Create one.` };
    }

    const battlefrontList = result.data
      .map((bf: any) => {
        const status = bf.status === 'ACTIVE' ? '●' : bf.status === 'WON' ? '✓' : '✗';
        return `${status} ${bf.name}\n  Exit: ${bf.binary_exit_target || 'Not set'}`;
      })
      .join('\n\n');

    return { message: `BATTLEFRONTS (${result.data.length}):\n\n${battlefrontList}` };
  }

  private async listMissions(): Promise<OrchestratorResult> {
    const result = await this.actions.getMissions();

    if (!result.success) {
      return { message: `Error: ${result.error}` };
    }

    if (!result.data || result.data.length === 0) {
      return { message: `No missions. Create one.` };
    }

    const missions = result.data;
    const done = missions.filter((m: any) => m.status === 'DONE').length;
    const notDone = missions.filter((m: any) => m.status === 'NOT_DONE').length;

    const missionList = missions
      .slice(0, 10)
      .map((m: any) => {
        const status = m.status === 'DONE' ? '✓' : '○';
        const bf = Array.isArray(m.battlefront) ? m.battlefront[0] : m.battlefront;
        return `${status} ${m.title} (${bf?.name})\n  Due: ${this.formatDateTime(new Date(m.due_date))}`;
      })
      .join('\n\n');

    return {
      message: `MISSIONS (${missions.length} total, ${done} done, ${notDone} active):\n\n${missionList}`,
    };
  }

  private async getSystemStatus(): Promise<OrchestratorResult> {
    const result = await this.actions.getSystemStats();

    if (!result.success) {
      return {
        message: `**ERROR**

Failed to fetch system status: ${result.error}`,
      };
    }

    const stats = result.data;

    return {
      message: `**SYSTEM STATUS REPORT**

BATTLEFRONTS:
• Total: ${stats.battlefronts.total}
• Active: ${stats.battlefronts.active}
• Won: ${stats.battlefronts.won}
• Collapsing: ${stats.battlefronts.collapsing}

MISSIONS:
• Total: ${stats.missions.total}
• Done: ${stats.missions.done}
• Active: ${stats.missions.notDone}
• Scheduled: ${stats.missions.scheduled}

CALENDAR:
• Events: ${stats.calendar.totalEvents}

${this.generateStrategicAnalysis(stats)}`,
    };
  }

  private generateStrategicAnalysis(stats: any): string {
    const issues = [];

    if (stats.battlefronts.collapsing > 0) {
      issues.push(`⚠️  ${stats.battlefronts.collapsing} battlefront(s) collapsing - IMMEDIATE ACTION REQUIRED`);
    }

    if (stats.missions.notDone > stats.missions.scheduled) {
      const unscheduled = stats.missions.notDone - stats.missions.scheduled;
      issues.push(`⚠️  ${unscheduled} mission(s) not scheduled - TIME BLOCKS NEEDED`);
    }

    if (stats.battlefronts.total === 0) {
      issues.push(`⚠️  No battlefronts - STRATEGIC DIRECTION MISSING`);
    }

    if (issues.length === 0) {
      return `SITUATION: Nominal. All systems operational.`;
    }

    return `STRATEGIC WARNINGS:\n${issues.join('\n')}`;
  }

  private async startBattlefrontUpdate(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**BATTLEFRONT UPDATE**

This feature is coming soon.

For now, you can create a new battlefront or delete an existing one.`,
    };
  }

  private async startBattlefrontDeletion(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**BATTLEFRONT DELETION**

This feature is coming soon.

Use the War Map UI to delete battlefronts for now.`,
    };
  }

  private async startCheckpointToggle(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**CHECKPOINT TOGGLE**

This feature is coming soon.

Use the Battlefront page to toggle checkpoints for now.`,
    };
  }

  private async startCheckpointDeletion(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**CHECKPOINT DELETION**

This feature is coming soon.

Use the Battlefront page to delete checkpoints for now.`,
    };
  }

  private async startMissionUpdate(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**MISSION UPDATE**

This feature is coming soon.

For now, create a new mission or use the Master Missions page.`,
    };
  }

  private async startMissionDeletion(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**MISSION DELETION**

This feature is coming soon.

Use the Master Missions page to manage missions for now.`,
    };
  }

  private async startMissionMarkDone(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**MARK MISSION DONE**

This feature is coming soon.

Use the Master Missions page to mark missions complete for now.`,
    };
  }

  private async startMissionScheduling(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**MISSION SCHEDULING**

Include the schedule time when creating a mission.

Example: "Create mission to review proposal due Friday, work on it tomorrow at 10am"`,
    };
  }

  private async startEventReschedule(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**RESCHEDULE EVENT**

This feature is coming soon.

Use the Calendar page to reschedule events for now.`,
    };
  }

  private async startEventUnschedule(userMessage: string): Promise<OrchestratorResult> {
    return {
      message: `**UNSCHEDULE EVENT**

This feature is coming soon.

Use the Calendar page to remove events for now.`,
    };
  }

  private async planDay(): Promise<OrchestratorResult> {
    return {
      message: `**DAILY PLANNING PROTOCOL**

This feature is under development.

For now, use "create mission" and schedule it for today.`,
    };
  }

  private async planWeek(): Promise<OrchestratorResult> {
    return {
      message: `**WEEKLY PLANNING PROTOCOL**

This feature is under development.

For now, create missions for each day and schedule them.`,
    };
  }

  private async runOODA(): Promise<OrchestratorResult> {
    return {
      message: `**OODA LOOP REVIEW**

This feature is under development.

The OODA Loop will:
1. Observe: Analyze completion rates
2. Orient: Identify patterns
3. Decide: Propose adjustments
4. Act: Update missions and priorities`,
    };
  }

  private getDefaultResponse(): string {
    return `Not recognized.

Available commands:
• create battlefront
• create mission
• create checkpoint
• list battlefronts
• list missions
• system status

What do you need?`;
  }

  private selectBattlefront(input: string, battlefronts: any[]): any {
    const num = parseInt(input);
    if (!isNaN(num) && num > 0 && num <= battlefronts.length) {
      return battlefronts[num - 1];
    }

    return battlefronts.find((bf) => bf.name.toLowerCase().includes(input.toLowerCase()));
  }

  private extractTitle(message: string): string {
    const patterns = [
      /(?:create|add|make|schedule)\s+(?:a\s+)?(?:mission|task)\s+(?:to\s+)?["']?([^"']+?)["']?\s+(?:due|by|for|before)/i,
      /(?:create|add|make|schedule)\s+(?:a\s+)?(?:mission|task)\s+["']([^"']+)["']/i,
      /(?:i need to|need to|want to)\s+([^,\.]+?)(?:\s+by|\s+due|\s+before|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractDuration(message: string): number | null {
    const hourMatch = message.match(/(\d+)\s*(?:hour|hr)s?/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;

    const minMatch = message.match(/(\d+)\s*(?:minute|min)s?/i);
    if (minMatch) return parseInt(minMatch[1]);

    return null;
  }

  private extractDueDate(message: string): Date | null {
    const lowerMessage = message.toLowerCase();
    const now = new Date();

    if (lowerMessage.includes('today')) {
      const today = new Date(now);
      today.setHours(17, 0, 0, 0);
      return today;
    }

    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      return tomorrow;
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerMessage.includes(days[i])) {
        const targetDay = new Date(now);
        const currentDay = targetDay.getDay();
        const daysUntil = (i - currentDay + 7) % 7 || 7;
        targetDay.setDate(targetDay.getDate() + daysUntil);
        targetDay.setHours(17, 0, 0, 0);
        return targetDay;
      }
    }

    const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      const date = new Date(now);
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3].toLowerCase();

      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
      return date;
    }

    return null;
  }

  private extractAttackDate(message: string): Date | null {
    const lowerMessage = message.toLowerCase();
    const now = new Date();

    if (lowerMessage.includes('today')) return new Date(now);

    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    return null;
  }

  private extractStartTime(message: string, attackDate: Date): Date {
    const timeMatch = message.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

    if (timeMatch) {
      const date = new Date(attackDate);
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3].toLowerCase();

      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      date.setHours(hours, minutes, 0, 0);
      return date;
    }

    const defaultTime = new Date(attackDate);
    defaultTime.setHours(9, 0, 0, 0);
    return defaultTime;
  }

  private formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  }
}
