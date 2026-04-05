'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import type { Budget } from '@/types/game';
import {
  buildAiAdvisorMessages,
  buildAiWorldSnapshot,
  parseAdvisorResponse,
  type AiAdvisorAction,
} from '@/lib/aiWorldAdvisor';
import type { AiWorldApiConfig } from '@/lib/aiWorldModeStorage';

type BroadcastTax = (rate: number) => void;
type BroadcastBudget = (key: keyof Budget, funding: number) => void;
type BroadcastSpeed = (speed: 0 | 1 | 2 | 3) => void;

export function useAiWorldSimulation(opts: {
  enabled: boolean;
  config: AiWorldApiConfig | null;
  isMultiplayer: boolean;
  isHost: boolean;
  broadcastTaxRate: BroadcastTax;
  broadcastBudget: BroadcastBudget;
  broadcastSpeed: BroadcastSpeed;
}) {
  const {
    state,
    latestStateRef,
    setTaxRate,
    setBudgetFunding,
    setSpeed,
    addNotification,
  } = useGame();

  const lastMonthRef = useRef<{ y: number; m: number } | null>(null);
  const inFlightRef = useRef(false);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const applyAction = useCallback((action: AiAdvisorAction) => {
    const o = optsRef.current;
    switch (action.type) {
      case 'set_tax_rate':
        setTaxRate(action.rate);
        if (o.isMultiplayer && o.isHost) o.broadcastTaxRate(action.rate);
        break;
      case 'set_budget_funding':
        setBudgetFunding(action.category, action.funding);
        if (o.isMultiplayer && o.isHost) o.broadcastBudget(action.category, action.funding);
        break;
      case 'set_speed':
        setSpeed(action.speed);
        if (o.isMultiplayer && o.isHost) o.broadcastSpeed(action.speed);
        break;
      case 'notify':
        addNotification(action.title, action.body, action.icon || '🤖');
        break;
      default:
        break;
    }
  }, [addNotification, setBudgetFunding, setSpeed, setTaxRate]);

  useEffect(() => {
    const { enabled, config, isMultiplayer, isHost } = optsRef.current;
    const canRun = enabled && config?.apiKey && (!isMultiplayer || isHost);
    if (!canRun) {
      lastMonthRef.current = null;
      return;
    }

    const s = latestStateRef.current;
    if (s.speed === 0) return;

    const y = s.year;
    const m = s.month;
    if (lastMonthRef.current === null) {
      lastMonthRef.current = { y, m };
      return;
    }
    if (lastMonthRef.current.y === y && lastMonthRef.current.m === m) {
      return;
    }

    lastMonthRef.current = { y, m };

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const cfg = config!;

    const run = async () => {
      try {
        const snapshot = buildAiWorldSnapshot(latestStateRef.current);
        const messages = buildAiAdvisorMessages(snapshot);
        const res = await fetch('/api/ai-world', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: cfg.baseUrl,
            model: cfg.model,
            apiKey: cfg.apiKey,
            messages,
          }),
        });
        const data = (await res.json()) as { content?: string; error?: string };
        if (!res.ok) {
          addNotification(
            'AI advisor',
            data.error || `Request failed (${res.status})`,
            '⚠️',
          );
          return;
        }
        const parsed = typeof data.content === 'string' ? parseAdvisorResponse(data.content) : null;
        if (!parsed) {
          addNotification('AI advisor', 'Could not parse model response.', '⚠️');
          return;
        }
        for (const act of parsed.actions) {
          applyAction(act);
        }
        if (parsed.reason) {
          addNotification('AI advisor', parsed.reason, '🤖');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        addNotification('AI advisor', msg, '⚠️');
      } finally {
        inFlightRef.current = false;
      }
    };

    void run();
  }, [
    state.year,
    state.month,
    state.speed,
    opts.enabled,
    opts.config,
    opts.isMultiplayer,
    opts.isHost,
    latestStateRef,
    addNotification,
    applyAction,
  ]);
}
