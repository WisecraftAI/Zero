/**
 * Cloud adapter contracts (Target architecture — architectureV2.html).
 * Implementations live under lib/cloud/{local,aws,gcp,azure,vercel}/
 */

export type Unsubscribe = () => void;

export interface ObjectStore {
  presignPut(key: string, ttlSec?: number): Promise<string>;
  presignGet(key: string, ttlSec?: number): Promise<string>;
  put(key: string, body: Buffer | NodeJS.ReadableStream, meta?: object): Promise<void>;
  get(key: string): Promise<NodeJS.ReadableStream>;
  remove(key: string): Promise<void>;
}

export interface Queue<T = unknown> {
  publish(topic: string, msg: T, opts?: { dedupId?: string }): Promise<void>;
  subscribe(topic: string, handler: (msg: T) => Promise<void>): Unsubscribe;
}

export interface Secrets {
  get(name: string): Promise<string>;
  put(name: string, value: string): Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, val: T, ttlSec?: number): Promise<void>;
  publish(channel: string, msg: unknown): Promise<void>;
  subscribe(channel: string, cb: (msg: unknown) => void): Unsubscribe;
}

export interface CloudBundle {
  objectStore: ObjectStore;
  queue: Queue;
  secrets: Secrets;
  cache: Cache;
}
