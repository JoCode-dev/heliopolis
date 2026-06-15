'use client';

import { useCallback, useRef, useState } from 'react';
import { codexApi } from '@/lib/api';
import type { Submission } from '@/types';

const DEFAULT_EMOJI = '❤️';

type SyncOptions = {
  replace?: boolean;
};

type ReactionStateResponse = {
  count: number;
  reacted: boolean;
};

export function getCodexReactionCount(submission: Submission) {
  return submission._count?.reactions ?? submission.reactions?.length ?? 0;
}

export function getReactedSubmissionIds(
  submissions: Submission[],
  userId?: string,
  emoji = DEFAULT_EMOJI,
) {
  const ids = new Set<string>();
  if (!userId) return ids;

  for (const submission of submissions) {
    if (submission.reactions?.some(reaction => reaction.userId === userId && reaction.emoji === emoji)) {
      ids.add(submission.id);
    }
  }

  return ids;
}

function getReactionCountMap(submissions: Submission[]) {
  const counts: Record<string, number> = {};
  for (const submission of submissions) {
    counts[submission.id] = getCodexReactionCount(submission);
  }
  return counts;
}

function isReactionStateResponse(value: unknown): value is ReactionStateResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ReactionStateResponse).count === 'number' &&
    typeof (value as ReactionStateResponse).reacted === 'boolean'
  );
}

export function useCodexReactions(currentUserId?: string, initialSubmissions: Submission[] = []) {
  const lastUserIdRef = useRef(currentUserId);
  const [reactions, setReactions] = useState<Record<string, number>>(() =>
    getReactionCountMap(initialSubmissions),
  );
  const [reacted, setReacted] = useState<Set<string>>(() =>
    getReactedSubmissionIds(initialSubmissions, currentUserId),
  );
  const [reactionPending, setReactionPending] = useState<Set<string>>(new Set());

  const syncSubmissions = useCallback((submissions: Submission[], options: SyncOptions = {}) => {
    const userChanged = lastUserIdRef.current !== currentUserId;
    lastUserIdRef.current = currentUserId;

    setReactions(prev => {
      const next = options.replace ? {} : { ...prev };
      for (const submission of submissions) {
        next[submission.id] = getCodexReactionCount(submission);
      }
      return next;
    });

    setReacted(prev => {
      if (!currentUserId) return new Set();

      const serverReacted = getReactedSubmissionIds(submissions, currentUserId);
      const next = options.replace || userChanged ? new Set<string>() : new Set(prev);
      for (const id of serverReacted) next.add(id);
      return next;
    });
  }, [currentUserId]);

  const applyServerState = useCallback((id: string, data: unknown) => {
    if (!isReactionStateResponse(data)) return;

    setReactions(prev => ({ ...prev, [id]: data.count }));
    setReacted(prev => {
      const next = new Set(prev);
      if (data.reacted) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleReact = useCallback(async (id: string) => {
    if (!currentUserId || reacted.has(id) || reactionPending.has(id)) return;

    setReactionPending(prev => new Set(prev).add(id));
    setReacted(prev => new Set(prev).add(id));
    setReactions(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

    try {
      const { data } = await codexApi.react(id);
      applyServerState(id, data);
    } catch {
      setReacted(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setReactions(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 1) - 1) }));
    } finally {
      setReactionPending(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [applyServerState, currentUserId, reacted, reactionPending]);

  const handleUnreact = useCallback(async (id: string) => {
    if (!currentUserId || !reacted.has(id) || reactionPending.has(id)) return;

    setReactionPending(prev => new Set(prev).add(id));
    setReacted(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setReactions(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 1) - 1) }));

    try {
      const { data } = await codexApi.unreact(id);
      applyServerState(id, data);
    } catch {
      setReacted(prev => new Set(prev).add(id));
      setReactions(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    } finally {
      setReactionPending(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [applyServerState, currentUserId, reacted, reactionPending]);

  return {
    reactions,
    reacted,
    reactionPending,
    syncSubmissions,
    handleReact,
    handleUnreact,
  };
}
