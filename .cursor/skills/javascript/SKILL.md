---
name: javascript
description: "JavaScript and TypeScript best practices, design patterns, and anti-patterns. Use when writing or reviewing JS/TS code quality, async patterns, error handling, array/object manipulation, type safety, module design, design patterns, or performance. Also triggers on 'async/await', 'promise', 'closure', 'destructuring', 'spread operator', 'optional chaining', 'nullish coalescing', 'map/filter/reduce', 'type guard', 'type narrowing', 'generic', 'enum vs const', 'ES module', 'singleton', 'observer pattern', 'factory pattern', or 'strategy pattern'."
version: 2.0.0
---

# JavaScript & TypeScript Best Practices

Patterns with clear **when to use** and **when NOT to use** guidance. Written for TypeScript-first development with modern ES2022+ features.

---

## Variables & Declarations

| Declaration | When to Use                                         | When NOT to Use                                |
| ----------- | --------------------------------------------------- | ---------------------------------------------- |
| `const`     | Default choice — 95% of declarations                | When you need reassignment                     |
| `let`       | Loop counters, accumulators, conditional assignment | When `const` works (most cases)                |
| `var`       | Never                                               | Always — it has function scope + hoisting bugs |

```typescript
// ✅ const for everything by default
const users = await fetchUsers();
const filtered = users.filter((u) => u.active);
const count = filtered.length;

// ✅ let only when reassignment is necessary
let retries = 3;
while (retries > 0) {
  try {
    await connect();
    break;
  } catch {
    retries--;
  }
}

// ❌ NEVER var
var name = 'bad'; // Hoists, leaks scope — use const/let
```

---

## Async Patterns

### async/await vs Promises vs callbacks

| Pattern                | When to Use                                                | When NOT to Use                         |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `async/await`          | Sequential async operations, error handling with try/catch | Parallel operations (use `Promise.all`) |
| `Promise.all()`        | Multiple independent async ops in parallel                 | When ops depend on each other           |
| `Promise.allSettled()` | Parallel ops where some can fail without killing others    | When all must succeed                   |
| `Promise.race()`       | Timeout patterns, first-response-wins                      | When you need all results               |
| Raw `.then()` chain    | Almost never — `async/await` is clearer                    | Default to `async/await` instead        |
| Callbacks              | Legacy API integration only                                | New code — use Promises                 |

```typescript
// ✅ Sequential — use async/await
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId);
  const validated = await validateOrder(order);
  const result = await chargePayment(validated);
  return result;
}

// ✅ Parallel — use Promise.all
async function loadDashboard(userId: string) {
  const [profile, stats, notifications] = await Promise.all([
    fetchProfile(userId),
    fetchStats(userId),
    fetchNotifications(userId),
  ]);
  return { profile, stats, notifications };
}

// ✅ Parallel with partial failure tolerance
async function sendNotifications(users: User[]) {
  const results = await Promise.allSettled(users.map((u) => sendEmail(u.email)));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) console.warn(`${failed.length} notifications failed`);
}

// ✅ Timeout pattern
async function fetchWithTimeout(url: string, ms: number) {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([fetch(url), timeout]);
}

// ❌ DON'T — async function that doesn't await
async function bad() {
  return 42;
} // Remove async, just return 42

// ❌ DON'T — await in a loop when parallelizable
for (const id of ids) {
  await processItem(id); // Sequential! Use Promise.all if independent
}
```

### Error Handling

| Pattern                 | When to Use                                         | When NOT to Use                                        |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `try/catch`             | Async operations, external API calls, file I/O      | Around every function call (overkill)                  |
| Error types/classes     | Different recovery strategies per error             | Simple pass/fail scenarios                             |
| Optional chaining `?.`  | Accessing nested properties that might be undefined | When null/undefined is a bug (let it throw)            |
| Nullish coalescing `??` | Default values where 0, '', false are valid         | When you want to replace ALL falsy values (use `\|\|`) |

```typescript
// ✅ try/catch at the boundary — not around every line
async function fetchUser(id: string): Promise<User | null> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return null;
  }
}

// ✅ Optional chaining — safe nested access
const city = user?.address?.city; // undefined if any level is null/undefined

// ✅ Nullish coalescing — default only for null/undefined
const port = config.port ?? 3000; // Uses 3000 only if port is null/undefined
const name = input ?? 'Anonymous'; // Preserves '' and 0 (unlike ||)

// ❌ DON'T confuse ?? with ||
const count = data.count || 10; // BUG: replaces 0 with 10!
const count = data.count ?? 10; // CORRECT: only replaces null/undefined

// ❌ DON'T — empty catch blocks
try {
  await save();
} catch {} // Silently swallows errors — always handle or log
```

---

## Arrays & Objects

### Array Methods: When to Use Which

| Method         | Purpose                       | Returns                  | When to Use                      | When NOT to Use                                         |
| -------------- | ----------------------------- | ------------------------ | -------------------------------- | ------------------------------------------------------- |
| `.map()`       | Transform each item           | New array (same length)  | Convert data shapes              | Side effects (use `.forEach`)                           |
| `.filter()`    | Keep items matching condition | New array (≤ length)     | Selecting subsets                | When you need the index of match (use `.findIndex`)     |
| `.find()`      | First item matching condition | Single item or undefined | Looking up one item              | When you need all matches (use `.filter`)               |
| `.findIndex()` | Index of first match          | Number (-1 if none)      | Need position, not value         | When you need the item (use `.find`)                    |
| `.some()`      | Any item matches?             | Boolean                  | Existence check                  | When you need which items (use `.filter`)               |
| `.every()`     | All items match?              | Boolean                  | Validation                       | When you need failures (use `.filter` for non-matching) |
| `.reduce()`    | Accumulate into single value  | Anything                 | Sums, grouping, building objects | Simple transforms (use `.map` + `.filter`)              |
| `.forEach()`   | Execute side effect per item  | undefined                | Logging, mutations, DOM ops      | When you need a result (use `.map`)                     |
| `.flatMap()`   | Map then flatten one level    | New flat array           | One-to-many transforms           | Simple one-to-one transforms (use `.map`)               |
| `.includes()`  | Value exists in array?        | Boolean                  | Simple value lookup              | Complex matching (use `.some`)                          |

```typescript
// ✅ Chain methods — clean data pipeline
const activeEmails = users
  .filter((u) => u.active)
  .map((u) => u.email.toLowerCase())
  .sort();

// ✅ reduce for grouping
const byCategory = items.reduce<Record<string, Item[]>>((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});

// ❌ DON'T — reduce when map/filter is clearer
// BAD:
const names = users.reduce((acc, u) => [...acc, u.name], [] as string[]);
// GOOD:
const names = users.map((u) => u.name);

// ❌ DON'T — forEach to build a new array
const results: string[] = [];
users.forEach((u) => results.push(u.name)); // Use .map() instead
```

### Object Patterns

| Pattern                              | When to Use                         | When NOT to Use                                            |
| ------------------------------------ | ----------------------------------- | ---------------------------------------------------------- |
| Spread `{ ...obj }`                  | Shallow copy, merge, override props | Deep nested objects (only copies top level)                |
| Destructuring `{ a, b }`             | Extract known properties            | When you need the whole object too (use separate variable) |
| Computed property `{ [key]: value }` | Dynamic keys                        | Static keys (just write them)                              |
| `Object.entries()`                   | Iterate key-value pairs             | When you only need keys or values                          |
| `Object.fromEntries()`               | Convert entries back to object      | Simple object construction                                 |
| Shorthand `{ name, age }`            | Variable name matches property name | When names don't match                                     |

```typescript
// ✅ Immutable update with spread
const updated = { ...user, email: newEmail };

// ✅ Destructure in function params
function greet({ name, age }: { name: string; age: number }) {
  return `${name} is ${age}`;
}

// ✅ Rest pattern — extract some, keep the rest
const { password, ...safeUser } = user; // safeUser has everything except password

// ❌ DON'T — spread for deep copy
const copy = { ...nested }; // Only shallow! nested.address is still shared
// Use structuredClone(nested) for deep copy
```

---

## TypeScript Patterns

### Type vs Interface

| Use         | When                                            | Why                                          |
| ----------- | ----------------------------------------------- | -------------------------------------------- |
| `interface` | Object shapes, component props, class contracts | Extendable, mergeable, better error messages |
| `type`      | Unions, intersections, mapped types, primitives | More flexible, handles non-object types      |

```typescript
// ✅ interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ type for unions and complex types
type Status = 'active' | 'inactive' | 'pending';
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type Nullable<T> = T | null;
```

### Type Narrowing & Guards

| Pattern              | When to Use                                         | When NOT to Use                        |
| -------------------- | --------------------------------------------------- | -------------------------------------- |
| `typeof`             | Primitive checks (string, number, boolean)          | Object type checks                     |
| `instanceof`         | Class instance checks                               | Plain object checks                    |
| `in` operator        | Check if property exists on object                  | Doesn't prove the type of the property |
| Discriminated unions | Multiple types with a shared `type` or `kind` field | Unrelated types without common field   |
| Custom type guard    | Complex validation, API response parsing            | Simple checks (use `typeof`/`in`)      |

```typescript
// ✅ Discriminated union — the best pattern for variant types
type Shape = { kind: 'circle'; radius: number } | { kind: 'rect'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rect':
      return shape.width * shape.height;
  }
}

// ✅ Custom type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value
  );
}

// ❌ DON'T — type assertions to silence errors
const data = response as User; // Lies to the compiler
// GOOD — validate first
if (isUser(response)) {
  /* response is User here */
}
```

### Generics

| When to Use                                  | When NOT to Use                                   |
| -------------------------------------------- | ------------------------------------------------- |
| Container types (arrays, maps, responses)    | Single concrete type (just use the type directly) |
| Utility functions that work on any type      | When `unknown` + narrowing is sufficient          |
| Preserving input type through transformation | Adding complexity for no real flexibility         |

```typescript
// ✅ Generic utility — preserves type through transformation
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ✅ Constrained generic
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// ❌ DON'T — generic that's always one type
function bad<T>(x: T): T {
  return x;
} // This is just identity — pointless generic
// If T is always string, just use string
```

### Enum vs Const

| Pattern             | When to Use                                        | When NOT to Use                            |
| ------------------- | -------------------------------------------------- | ------------------------------------------ |
| `const enum`        | Compile-time constants, no runtime overhead needed | When you need runtime iteration            |
| String union `type` | Simple set of values, tree-shakeable               | When you need runtime access to all values |
| `as const` object   | Need runtime access to values AND type safety      | Simple string sets (use union type)        |

```typescript
// ✅ PREFERRED — string union type (simplest, tree-shakeable)
type Status = 'active' | 'inactive' | 'pending';

// ✅ USE — when you need runtime access to values
const STATUS = {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const;
type Status = (typeof STATUS)[keyof typeof STATUS];

// ⚠️ AVOID — TypeScript enum (generates runtime code, quirks with reverse mapping)
enum StatusEnum {
  Active,
  Inactive,
  Pending,
}
```

---

## Module Design

| Pattern                   | When to Use                                 | When NOT to Use                             |
| ------------------------- | ------------------------------------------- | ------------------------------------------- |
| Named exports             | Default — explicit, refactor-friendly       | Single primary export (use default)         |
| Default export            | React components (Next.js pages require it) | Utility modules with multiple exports       |
| Barrel file (`index.ts`)  | Public API of a module folder               | Deep internal re-exports (creates coupling) |
| Dynamic import `import()` | Code splitting, lazy loading                | Modules needed immediately                  |

```typescript
// ✅ Named exports — explicit and refactor-safe
export function formatDate(d: Date): string { /* ... */ }
export function parseDate(s: string): Date { /* ... */ }

// ✅ Default export for pages (Next.js requirement)
export default function HomePage() { return <div>Home</div>; }

// ❌ DON'T — re-export everything through barrel files
// src/utils/index.ts
export * from './dates';
export * from './strings';
export * from './numbers';
// ↑ Breaks tree-shaking, creates circular dep risk, slows bundler
```

---

## Common Anti-Patterns

| Anti-Pattern                      | Problem                                                             | Better Pattern                                         |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `== null` without understanding   | Catches both null and undefined (often intentional, but surprising) | Be explicit: `=== null \|\| === undefined` or use `??` |
| `arr.length === 0` after filter   | Two iterations                                                      | Use `.some()` or `.every()`                            |
| Nested ternaries                  | Unreadable                                                          | Use `if/else` or early return                          |
| `JSON.parse(JSON.stringify(obj))` | Slow, drops functions/dates/undefined                               | Use `structuredClone()`                                |
| Magic numbers                     | Unclear intent                                                      | Named constants: `const MAX_RETRIES = 3`               |
| String concatenation for paths    | OS-dependent separators                                             | Use `path.join()` in Node.js                           |
| `any` type                        | Defeats TypeScript's purpose                                        | Use `unknown` + type narrowing                         |
| `!` non-null assertion            | Lies to compiler, runtime crash                                     | Check for null/undefined first                         |
| Floating promises                 | Unhandled rejections                                                | Always `await` or handle with `.catch()`               |
| Mutable default parameters        | Shared reference across calls                                       | Use `undefined` default + spread                       |

---

## Performance Tips

| Tip                                                        | When It Matters                                        |
| ---------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Use `Map`/`Set` over plain objects for frequent lookups    | 1000+ entries, hot paths                               |
| Use `for...of` over `.forEach`                             | Tight loops where performance matters                  |
| Avoid creating objects in hot loops                        | Garbage collection pressure                            |
| Use `WeakMap`/`WeakRef` for caches                         | Memory-sensitive applications                          |
| Prefer `===` over `==`                                     | Always — no performance diff, but avoids coercion bugs |
| Use `Array.from({ length: n })` over `new Array(n).fill()` | Sparse array avoidance                                 |
| Avoid `delete obj.prop`                                    | Deoptimizes V8 hidden classes                          | Use `undefined` assignment or rest/spread |

---

## Design Patterns in JavaScript/TypeScript

### 1. Module Pattern (Encapsulation)

```typescript
// ✅ ES Module — the natural pattern in modern JS
// analytics.ts
const queue: AnalyticsEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// Private — not exported
function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  navigator.sendBeacon('/api/analytics', JSON.stringify(batch));
}

// Public API
export function track(event: string, data?: Record<string, unknown>) {
  queue.push({ event, data, timestamp: Date.now() });
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flush();
      flushTimer = null;
    }, 5000);
  }
}

export function flushNow() {
  flush();
}
```

| When to Use                                | When NOT to Use                        |
| ------------------------------------------ | -------------------------------------- |
| Encapsulating private state                | When a simple function export suffices |
| Modules with initialization logic          | Stateless utility functions            |
| Service modules (analytics, logging, auth) | Pure data transformation               |

### 2. Observer / Event Emitter Pattern

```typescript
// ✅ Type-safe event emitter
type EventMap = {
  'playback:start': { contentId: string; position: number };
  'playback:pause': { contentId: string; position: number };
  'playback:error': { contentId: string; error: string };
  'auth:login': { userId: string };
  'auth:logout': undefined;
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(data: any) => void>>();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler); // Returns unsubscribe
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }
}

// Usage
const bus = new TypedEventEmitter<EventMap>();
const unsub = bus.on('playback:start', ({ contentId }) => {
  console.log(`Playing: ${contentId}`);
});
bus.emit('playback:start', { contentId: 'tt-001', position: 0 });
unsub(); // Clean up
```

| When to Use                                 | When NOT to Use                                     |
| ------------------------------------------- | --------------------------------------------------- |
| Decoupled communication between modules     | Direct function calls between tightly coupled code  |
| Plugin / extension systems                  | Simple parent-child data flow (use props/callbacks) |
| Cross-cutting concerns (analytics, logging) | When there are < 2 consumers                        |

### 3. Strategy Pattern

```typescript
// ✅ Interchangeable algorithms at runtime
interface CompressionStrategy {
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
  readonly name: string;
}

const gzipStrategy: CompressionStrategy = {
  name: 'gzip',
  compress: (data) => gzipAsync(data),
  decompress: (data) => gunzipAsync(data),
};

const brotliStrategy: CompressionStrategy = {
  name: 'brotli',
  compress: (data) => brotliCompressAsync(data),
  decompress: (data) => brotliDecompressAsync(data),
};

// Select strategy based on client capabilities
function getCompressionStrategy(acceptEncoding: string): CompressionStrategy {
  if (acceptEncoding.includes('br')) return brotliStrategy;
  return gzipStrategy;
}
```

| When to Use                                | When NOT to Use                |
| ------------------------------------------ | ------------------------------ |
| Multiple algorithms for same operation     | Only one implementation exists |
| Runtime decisions (A/B tests, device type) | Compile-time decisions         |
| Swappable API clients, parsers, formatters | Simple if/else with 2 branches |

### 4. Factory Pattern

```typescript
// ✅ Factory for creating service clients
interface ApiClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
}

function createApiClient(config: { baseUrl: string; token?: string; timeout?: number }): ApiClient {
  const { baseUrl, token, timeout = 10000 } = config;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${baseUrl}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: <T>(url: string) => request<T>('GET', url),
    post: <T>(url: string, body: unknown) => request<T>('POST', url, body),
  };
}

// Usage — create different clients for different services
const catalogApi = createApiClient({ baseUrl: '/api/v1', token: authToken });
const analyticsApi = createApiClient({ baseUrl: '/analytics', timeout: 3000 });
```

| When to Use                                | When NOT to Use                            |
| ------------------------------------------ | ------------------------------------------ |
| Complex object creation with configuration | Simple `new` or object literal             |
| Multiple variants of same interface        | Single implementation                      |
| Encapsulating creation logic               | When caller needs full control of creation |

### 5. Builder Pattern

```typescript
// ✅ Fluent builder for complex query construction
class QueryBuilder {
  private filters: string[] = [];
  private sortField?: string;
  private sortOrder: 'asc' | 'desc' = 'asc';
  private pageNum = 1;
  private pageSize = 20;

  where(field: string, op: '=' | '>' | '<' | 'like', value: string | number): this {
    this.filters.push(`${field} ${op} ${JSON.stringify(value)}`);
    return this;
  }

  sort(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.sortField = field;
    this.sortOrder = order;
    return this;
  }

  page(num: number, size: number = 20): this {
    this.pageNum = num;
    this.pageSize = size;
    return this;
  }

  build(): QueryParams {
    return {
      filter: this.filters.join(' AND '),
      sort: this.sortField ? `${this.sortField}:${this.sortOrder}` : undefined,
      offset: (this.pageNum - 1) * this.pageSize,
      limit: this.pageSize,
    };
  }
}

// Usage
const query = new QueryBuilder()
  .where('genre', '=', 'action')
  .where('rating', '>', 7)
  .sort('releaseDate', 'desc')
  .page(2, 50)
  .build();
```

| When to Use                                   | When NOT to Use                |
| --------------------------------------------- | ------------------------------ |
| Objects with 5+ optional configuration params | Objects with 1-3 params        |
| Step-by-step construction (queries, requests) | Simple data objects            |
| When construction order matters               | Plain config objects work fine |

### 6. Retry Pattern with Exponential Backoff

```typescript
// ✅ Generic retry utility
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, shouldRetry = () => true } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Jitter
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const data = await withRetry(() => fetch('/api/content').then((r) => r.json()), {
  maxRetries: 3,
  shouldRetry: (err) => !(err instanceof TypeError), // Don't retry network errors
});
```

| When to Use                 | When NOT to Use                                    |
| --------------------------- | -------------------------------------------------- |
| Transient network failures  | Non-idempotent operations (POST with side effects) |
| External API calls          | Client-side validation errors                      |
| Database connection retries | 4xx HTTP errors (client bugs)                      |
