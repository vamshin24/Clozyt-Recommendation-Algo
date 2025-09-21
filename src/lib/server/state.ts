import { DEFAULT_TOP_M, SEEN_CAPACITY } from "./env";
import { LruIdSet } from "./lru";
import type { FeedbackEvent, PacketItem } from "./types";

export type UserState = {
  centroid: Float32Array | null;
  negative: Float32Array | null;
  topM: number;
  lastPacket: PacketItem[];
  packetHistory: PacketItem[][];
  seen: LruIdSet;
  eventBuffer: FeedbackEvent[];
};

const PACKET_HISTORY_LIMIT = 4;

const states = new Map<string, UserState>();

export function getUserState(userId: string): UserState {
  let state = states.get(userId);
  if (!state) {
    state = {
      centroid: null,
      negative: null,
      topM: DEFAULT_TOP_M,
      lastPacket: [],
      packetHistory: [],
      seen: new LruIdSet(SEEN_CAPACITY),
      eventBuffer: [],
    };
    states.set(userId, state);
  }
  return state;
}

export function setLastPacket(state: UserState, packet: PacketItem[]): void {
  state.lastPacket = packet;
  state.packetHistory.push(packet);
  if (state.packetHistory.length > PACKET_HISTORY_LIMIT) {
    state.packetHistory.shift();
  }
  state.seen.addMany(packet.map((item) => item.item_id));
}

export function appendEvents(state: UserState, events: FeedbackEvent[]): FeedbackEvent[] | null {
  if (!events.length) {
    return null;
  }
  state.eventBuffer.push(...events);
  if (state.eventBuffer.length >= 5) {
    const batch = state.eventBuffer.slice(-5);
    state.eventBuffer = [];
    return batch;
  }
  return null;
}

export function clearUserState(): void {
  states.clear();
}

export function getTrackedUserCount(): number {
  return states.size;
}
