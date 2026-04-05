import type { Budget, GameState } from '@/types/game';

const BUDGET_KEYS: (keyof Budget)[] = [
  'police',
  'fire',
  'health',
  'education',
  'transportation',
  'parks',
  'power',
  'water',
];

export type AiAdvisorAction =
  | { type: 'set_tax_rate'; rate: number }
  | { type: 'set_budget_funding'; category: keyof Budget; funding: number }
  | { type: 'set_speed'; speed: 0 | 1 | 2 | 3 }
  | { type: 'notify'; title: string; body: string; icon?: string };

export type AiAdvisorResponse = {
  reason?: string;
  actions: AiAdvisorAction[];
};

function countZones(grid: GameState['grid']): { residential: number; commercial: number; industrial: number } {
  let residential = 0;
  let commercial = 0;
  let industrial = 0;
  for (const row of grid) {
    for (const t of row) {
      if (t.zone === 'residential') residential++;
      if (t.zone === 'commercial') commercial++;
      if (t.zone === 'industrial') industrial++;
    }
  }
  return { residential, commercial, industrial };
}

/** Compact, non-secret snapshot for the model */
export function buildAiWorldSnapshot(state: GameState): Record<string, unknown> {
  const zones = countZones(state.grid);
  return {
    cityName: state.cityName,
    date: { year: state.year, month: state.month, day: state.day },
    speed: state.speed,
    money: state.stats.money,
    population: state.stats.population,
    jobs: state.stats.jobs,
    happiness: state.stats.happiness,
    health: state.stats.health,
    education: state.stats.education,
    safety: state.stats.safety,
    environment: state.stats.environment,
    income: state.stats.income,
    expenses: state.stats.expenses,
    taxRate: state.taxRate,
    demand: state.stats.demand,
    budgetFunding: {
      police: state.budget.police.funding,
      fire: state.budget.fire.funding,
      health: state.budget.health.funding,
      education: state.budget.education.funding,
      transportation: state.budget.transportation.funding,
      parks: state.budget.parks.funding,
      power: state.budget.power.funding,
      water: state.budget.water.funding,
    },
    zonedTiles: zones,
    disastersEnabled: state.disastersEnabled,
    recentNotifications: state.notifications.slice(-5).map((n) => ({
      title: n.title,
      description: n.description,
    })),
  };
}

export function buildAiAdvisorMessages(snapshot: Record<string, unknown>): {
  role: 'system' | 'user';
  content: string;
}[] {
  const system = `You are an automated city advisor for a light city-building simulation.
Each in-game month you may propose a small set of safe policy changes.
Respond with ONLY valid JSON (no markdown fences) in this shape:
{"reason":"one short sentence","actions":[]}

Allowed action types (use sparingly, max 5 actions per month):
- {"type":"set_tax_rate","rate":<number 0-100>}
- {"type":"set_budget_funding","category":<one of: police,fire,health,education,transportation,parks,power,water>,"funding":<0-100>}
- {"type":"set_speed","speed":<0,1,2,3>}  // simulation speed; 0 pauses
- {"type":"notify","title":"<short>","body":"<one sentence>","icon":"optional emoji"}

Do not invent fields. Prefer notify + small tax/budget tweaks over large swings. If no change is needed, use an empty actions array.`;

  const user = `Current city snapshot (JSON):\n${JSON.stringify(snapshot)}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function parseAdvisorResponse(raw: string): AiAdvisorResponse | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const actions = (parsed as { actions?: unknown }).actions;
    if (!Array.isArray(actions)) return null;
    const out: AiAdvisorAction[] = [];
    for (const a of actions) {
      if (!a || typeof a !== 'object') continue;
      const type = (a as { type?: string }).type;
      if (type === 'set_tax_rate') {
        const rate = Number((a as { rate?: unknown }).rate);
        if (Number.isFinite(rate)) {
          out.push({ type: 'set_tax_rate', rate: Math.max(0, Math.min(100, rate)) });
        }
      } else if (type === 'set_budget_funding') {
        const category = (a as { category?: string }).category as keyof Budget;
        const funding = Number((a as { funding?: unknown }).funding);
        if (BUDGET_KEYS.includes(category) && Number.isFinite(funding)) {
          out.push({
            type: 'set_budget_funding',
            category,
            funding: Math.max(0, Math.min(100, Math.round(funding))),
          });
        }
      } else if (type === 'set_speed') {
        const speed = Number((a as { speed?: unknown }).speed) as 0 | 1 | 2 | 3;
        if (speed === 0 || speed === 1 || speed === 2 || speed === 3) {
          out.push({ type: 'set_speed', speed });
        }
      } else if (type === 'notify') {
        const title = String((a as { title?: unknown }).title ?? '').slice(0, 120);
        const body = String((a as { body?: unknown }).body ?? '').slice(0, 500);
        const icon = (a as { icon?: unknown }).icon;
        if (title && body) {
          out.push({
            type: 'notify',
            title,
            body,
            icon: typeof icon === 'string' ? icon.slice(0, 8) : undefined,
          });
        }
      }
    }
    const reason =
      typeof (parsed as { reason?: unknown }).reason === 'string'
        ? String((parsed as { reason: string }).reason).slice(0, 200)
        : undefined;
    return { reason, actions: out.slice(0, 8) };
  } catch {
    return null;
  }
}
