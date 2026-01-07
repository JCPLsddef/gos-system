export type ConversationState = {
  intent?: string;
  context?: Record<string, any>;
  awaitingAnswer?: string;
  flow?: string;
  step?: number;
};

const conversationStates = new Map<string, ConversationState>();

export function getConversationState(userId: string): ConversationState {
  return conversationStates.get(userId) || {};
}

export function setConversationState(userId: string, state: ConversationState): void {
  conversationStates.set(userId, state);
}

export function clearConversationState(userId: string): void {
  conversationStates.delete(userId);
}

export function updateConversationContext(userId: string, context: Record<string, any>): void {
  const current = getConversationState(userId);
  setConversationState(userId, {
    ...current,
    context: { ...current.context, ...context },
  });
}
