---
name: react
description: "React 19 + Next.js patterns, design patterns, OTT-scale architecture, and anti-patterns. Use when writing React components, hooks, context, state management, rendering optimization, Next.js pages/API routes, video player UI, content catalogs, or streaming platform frontends. Also triggers on 'component design', 'hooks pattern', 're-render', 'state management', 'useEffect', 'useMemo', 'useCallback', 'context provider', 'prop drilling', 'React performance', 'Next.js routing', 'OTT frontend', 'streaming UI', 'video player React', or 'content rail'."
version: 2.0.0
---

# React & Next.js Patterns

Battle-tested patterns for React 19 + Next.js (Pages Router). Every pattern includes **when to use**, **when NOT to use**, and **why** — so you pick the right tool every time.

## Component Design

### Function Components (always)

```tsx
// ✅ ALWAYS — function components with TypeScript interface
interface UserCardProps {
  name: string;
  email: string;
  onSelect?: (email: string) => void;
}

function UserCard({ name, email, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect?.(email)}>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}
```

**When NOT to use class components:** Always. There is no remaining reason to use class components in React 19.

### Component Size Rule

| Size          | Signal          | Action                                          |
| ------------- | --------------- | ----------------------------------------------- |
| < 50 lines    | Healthy         | Leave it                                        |
| 50-100 lines  | Watch           | Consider extraction if it has multiple concerns |
| 100-200 lines | Split           | Extract sub-components or custom hooks          |
| > 200 lines   | Mandatory split | Break into composition of smaller components    |

### Composition vs Inheritance

```tsx
// ✅ USE — composition with children
function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// ✅ USE — render props when children need data from parent
function DataFetcher({
  url,
  children,
}: {
  url: string;
  children: (data: unknown) => React.ReactNode;
}) {
  const data = useFetch(url);
  return <>{children(data)}</>;
}

// ❌ NEVER — inheritance
class SpecialCard extends Card {} // Don't do this
```

**When to use composition:** Always.
**When to use render props:** When a child needs access to data the wrapper provides.
**When to use inheritance:** Never in React.

---

## Hooks

### useState

```tsx
// ✅ USE — for values that trigger re-renders when changed
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);

// ✅ USE — functional updater when new state depends on old state
setCount((prev) => prev + 1);

// ❌ DON'T — derive state from props (just compute it)
// BAD: const [fullName, setFullName] = useState(first + ' ' + last);
// GOOD: const fullName = `${first} ${last}`;
```

| When to use `useState`            | When NOT to use `useState`                                |
| --------------------------------- | --------------------------------------------------------- |
| UI toggle (open/close, show/hide) | Derived values (compute inline)                           |
| Form input values                 | Values that don't affect rendering (use `useRef`)         |
| Local component state             | Values shared across many components (use Context)        |
| Simple counters/flags             | Complex state with multiple sub-values (use `useReducer`) |

### useEffect

```tsx
// ✅ USE — synchronize with external systems
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => setData(JSON.parse(e.data));
  return () => ws.close(); // Always clean up
}, [url]);

// ✅ USE — DOM measurements after render
useEffect(() => {
  const rect = ref.current?.getBoundingClientRect();
  if (rect) setHeight(rect.height);
}, []);

// ❌ DON'T — transform data for rendering (compute during render)
// BAD:
useEffect(() => {
  setFilteredList(items.filter((i) => i.active));
}, [items]);
// GOOD:
const filteredList = items.filter((i) => i.active);

// ❌ DON'T — fetch data on user action (use event handler instead)
// BAD:
useEffect(() => {
  if (submitted) fetchData();
}, [submitted]);
// GOOD:
const handleSubmit = async () => {
  await fetchData();
};
```

| When to use `useEffect`                    | When NOT to use `useEffect`                                  |
| ------------------------------------------ | ------------------------------------------------------------ |
| API subscriptions (WebSocket, EventSource) | Computing derived data                                       |
| Event listeners (resize, scroll, keydown)  | Responding to user events (use handlers)                     |
| Third-party library integration            | Setting state based on props (compute inline)                |
| DOM measurements                           | Fetching on mount (consider `getServerSideProps` in Next.js) |
| Timer/interval setup                       | Anything that can be done during render                      |

**Golden rule:** If you can calculate it during render, don't use `useEffect`.

### useRef

```tsx
// ✅ USE — DOM access
const inputRef = useRef<HTMLInputElement>(null);
const focusInput = () => inputRef.current?.focus();

// ✅ USE — mutable value that doesn't trigger re-render
const renderCount = useRef(0);
renderCount.current += 1; // No re-render

// ✅ USE — previous value tracking
const prevValue = useRef(value);
useEffect(() => {
  prevValue.current = value;
});

// ✅ USE — storing interval/timeout IDs
const intervalRef = useRef<NodeJS.Timeout>();
```

| When to use `useRef`                                | When NOT to use `useRef`                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| DOM element references                              | Values that should trigger re-render (use `useState`) |
| Mutable values across renders (no re-render needed) | Derived/computed values (compute inline)              |
| Previous value tracking                             | Shared state (use Context)                            |
| Timer/subscription IDs for cleanup                  |                                                       |

### useMemo

```tsx
// ✅ USE — expensive computation with stable inputs
const sortedItems = useMemo(() => items.sort((a, b) => a.name.localeCompare(b.name)), [items]);

// ✅ USE — referential stability for objects passed as props
const config = useMemo(() => ({ theme, locale }), [theme, locale]);

// ❌ DON'T — cheap operations
// BAD: const doubled = useMemo(() => count * 2, [count]);
// GOOD: const doubled = count * 2;

// ❌ DON'T — every single variable
// Over-memoizing is worse than not memoizing — adds complexity for no gain
```

| When to use `useMemo`                      | When NOT to use `useMemo`           |
| ------------------------------------------ | ----------------------------------- |
| Sorting/filtering large lists (100+ items) | Simple arithmetic or string ops     |
| Complex object transformations             | Primitive values (numbers, strings) |
| Values passed as deps to other hooks       | Values only used in JSX directly    |
| Preventing expensive child re-renders      | "Just in case" — measure first      |

**Rule of thumb:** If the computation takes < 1ms, don't memoize it.

### useCallback

```tsx
// ✅ USE — function passed to memoized child component
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// ✅ USE — function used as dependency of useEffect
const fetchUser = useCallback(async () => {
  const res = await fetch(`/api/user/${userId}`);
  setUser(await res.json());
}, [userId]);

useEffect(() => {
  fetchUser();
}, [fetchUser]);

// ❌ DON'T — functions not passed to children or used as deps
// BAD: const handleLocal = useCallback(() => setOpen(true), []);
// GOOD: const handleLocal = () => setOpen(true);
```

| When to use `useCallback`                     | When NOT to use `useCallback`                   |
| --------------------------------------------- | ----------------------------------------------- |
| Passed to `React.memo()` wrapped child        | Functions used only in the same component's JSX |
| Used as a dependency in `useEffect`/`useMemo` | Simple event handlers on native elements        |
| Event handlers passed through multiple levels | Functions recreated cheaply                     |

### useReducer

```tsx
// ✅ USE — complex state with multiple related values
type State = { items: Item[]; filter: string; page: number; loading: boolean };
type Action =
  | { type: 'SET_FILTER'; filter: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; items: Item[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filter: action.filter, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, items: action.items, loading: false };
  }
}
```

| When to use `useReducer`                     | When NOT to use `useReducer` |
| -------------------------------------------- | ---------------------------- |
| 3+ related state values that change together | Single boolean toggle        |
| State transitions have business logic        | Independent state values     |
| Next state depends on previous state         | Simple form with 1-2 fields  |
| You want testable state logic                |                              |

---

## State Management

### When to Use What

| Scenario                                | Solution                       | Why                              |
| --------------------------------------- | ------------------------------ | -------------------------------- |
| Single component UI state               | `useState`                     | Simplest option                  |
| Complex local state                     | `useReducer`                   | Testable, predictable            |
| 2-3 components need same data           | Lift state to parent + props   | Simple, explicit data flow       |
| App-wide theme/auth/locale              | `React.Context`                | Low-frequency updates            |
| Frequent updates across many components | External store (Zustand)       | Context re-renders all consumers |
| Server data (API responses)             | React Query / SWR              | Cache, refetch, stale handling   |
| URL state (filters, pagination)         | URL search params              | Shareable, bookmarkable          |
| Form state                              | React Hook Form or local state | Validation, performance          |

### Context: When It Works and When It Doesn't

```tsx
// ✅ GOOD use of Context — low-frequency, app-wide values
const ThemeContext = createContext<{ theme: string; toggle: () => void }>(/* ... */);
const AuthContext = createContext<{ user: User | null; logout: () => void }>(/* ... */);

// ❌ BAD use of Context — frequent updates cause re-renders in ALL consumers
const MousePositionContext = createContext({ x: 0, y: 0 }); // Updates 60fps!
const TimerContext = createContext({ seconds: 0 }); // Updates every second!
```

| Context works for                        | Context is wrong for               |
| ---------------------------------------- | ---------------------------------- |
| Theme (changes rarely)                   | Real-time data (mouse, timers)     |
| Auth state (changes on login/logout)     | Large lists that update frequently |
| Locale/i18n (changes on language switch) | Form state across many fields      |
| Feature flags                            | Chat messages arriving rapidly     |

**When Context causes performance problems:** Split into multiple contexts, or use an external store.

### Prop Drilling: When to Fix It

| Depth                                      | Solution                                                  |
| ------------------------------------------ | --------------------------------------------------------- |
| 1 level                                    | Just pass props — it's fine                               |
| 2 levels                                   | Still fine — explicit data flow is a feature              |
| 3+ levels                                  | Consider Context, composition, or component restructuring |
| Through components that don't use the prop | Composition pattern (pass children) or Context            |

---

## Next.js (Pages Router)

### Data Fetching

| Method                                | When to Use                                           | When NOT to Use                    |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `getServerSideProps`                  | Data changes every request (user-specific, real-time) | Static content, blog posts         |
| `getStaticProps`                      | Data changes infrequently (docs, marketing)           | User-specific data                 |
| `getStaticPaths` + `getStaticProps`   | Dynamic routes with known paths                       | Millions of pages                  |
| Client-side fetch (`useEffect` / SWR) | After-load data, user interactions                    | SEO-critical content               |
| API Routes (`pages/api/*`)            | Backend logic, third-party API proxy                  | Direct database access from client |

### API Routes

```tsx
// ✅ Pattern: typed handler with validation
import type { NextApiRequest, NextApiResponse } from 'next';

interface ResponseData {
  message: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | { error: string }>
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  res.status(200).json({ message: `Hello ${name}` });
}
```

| Do                                    | Don't                     |
| ------------------------------------- | ------------------------- |
| Validate request method               | Accept any method         |
| Type the response                     | Return untyped objects    |
| Validate request body                 | Trust client input        |
| Return proper HTTP status codes       | Always return 200         |
| Use environment variables for secrets | Expose API keys to client |

---

## Performance Patterns

### Preventing Unnecessary Re-renders

| Problem                                 | Solution                                   | When to Apply                        |
| --------------------------------------- | ------------------------------------------ | ------------------------------------ |
| Parent re-renders → child re-renders    | `React.memo()` on child                    | Child is expensive to render         |
| New object/array reference every render | `useMemo` for the value                    | Passed as prop to `React.memo` child |
| New function reference every render     | `useCallback` for the handler              | Passed as prop to `React.memo` child |
| Large list rendering                    | Virtualization (`react-window`)            | 100+ items in a scrollable list      |
| Heavy component on conditional render   | `React.lazy()` + `Suspense`                | Code-split routes or modals          |
| Layout shift during load                | Skeleton/placeholder with fixed dimensions | Any async content                    |

### React.memo — Use Sparingly

```tsx
// ✅ USE — expensive child that receives stable-ish props
const ExpensiveChart = React.memo(function Chart({ data }: { data: Point[] }) {
  // Complex SVG rendering...
});

// ❌ DON'T — cheap components or unstable props
const Label = React.memo(({ text }: { text: string }) => <span>{text}</span>);
// ↑ The memo overhead > the re-render cost
```

---

## Anti-Patterns to Avoid

| Anti-Pattern                                 | Problem                             | Better Pattern                                          |
| -------------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `useState` + `useEffect` to derive data      | Extra render cycle, stale data risk | Compute during render                                   |
| Copy props into state                        | State gets out of sync with props   | Use props directly, or use key to reset                 |
| Huge monolithic components                   | Hard to test, reuse, and understand | Extract by responsibility                               |
| Index as key in dynamic lists                | Breaks state when items reorder     | Use unique stable ID                                    |
| Fetching in `useEffect` without cleanup      | Race conditions on fast navigation  | Use abort controller, or SWR/React Query                |
| Mutating state directly                      | React won't detect the change       | Always create new object/array                          |
| `eslint-disable react-hooks/exhaustive-deps` | Stale closures, missed updates      | Fix the dependency array properly                       |
| Conditional hook calls                       | Breaks Rules of Hooks               | Restructure component or use early return before hooks  |
| Event handler in render without memo         | New reference per render            | Extract handler or use `useCallback` if passed to child |

---

## File Organization (This Project)

````
src/
  components/
    chat/           # Chat-specific components
    layout/         # Layout components (Header, etc.)
    library/        # Library view components
    shared/         # Reusable across features
  constants/        # App-wide constants
  services/         # API call functions
  store/            # Context providers (ChatContext, LibraryContext)
  types/            # TypeScript type definitions

---

## Design Patterns for React

### 1. Compound Component Pattern

Components that share implicit state. Perfect for complex UI primitives.

```tsx
// ✅ Tab system with compound components
interface TabsContextType { activeTab: string; setActiveTab: (id: string) => void; }
const TabsContext = createContext<TabsContextType | null>(null);

function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  return (
    <button role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab } = useContext(TabsContext)!;
  if (activeTab !== id) return null;
  return <div role="tabpanel">{children}</div>;
}

// Attach sub-components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage — clean, declarative API
<Tabs defaultTab="overview">
  <Tabs.List>
    <Tabs.Tab id="overview">Overview</Tabs.Tab>
    <Tabs.Tab id="episodes">Episodes</Tabs.Tab>
    <Tabs.Tab id="related">Related</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="overview"><ContentOverview /></Tabs.Panel>
  <Tabs.Panel id="episodes"><EpisodeList /></Tabs.Panel>
  <Tabs.Panel id="related"><RelatedContent /></Tabs.Panel>
</Tabs>
````

| When to Use                              | When NOT to Use                  |
| ---------------------------------------- | -------------------------------- |
| Tabs, accordion, dropdown, select, modal | Simple components with 1-2 props |
| Components with shared implicit state    | When explicit props are clearer  |
| Public component libraries               | Internal one-off components      |

### 2. Custom Hook Pattern (Extract & Reuse Logic)

```tsx
// ✅ Encapsulate complex logic in a custom hook
function useIntersectionObserver(
  ref: RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options.threshold, options.rootMargin]);

  return isVisible;
}

// ✅ Hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

| When to Use                         | When NOT to Use                       |
| ----------------------------------- | ------------------------------------- |
| Logic shared by 2+ components       | One-off logic in a single component   |
| Complex state + effect combinations | Simple `useState`                     |
| Testable business logic             | Pure rendering logic (use components) |

### 3. Higher-Order Component Pattern (Sparingly)

```tsx
// ✅ Cross-cutting concerns only — auth protection
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Redirect to="/login" />;
    return <Component {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

| When to Use                                       | When NOT to Use                      |
| ------------------------------------------------- | ------------------------------------ |
| Auth gates, error boundaries, analytics wrappers  | Data fetching (use hooks)            |
| When you need to wrap many components identically | When a custom hook achieves the same |
| Legacy codebase integration                       | New code (prefer hooks)              |

### 4. State Machine Pattern

For complex UI states with defined transitions (player, checkout, wizard).

```tsx
type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';
type PlayerAction =
  | { type: 'LOAD' }
  | { type: 'LOADED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'BUFFER' }
  | { type: 'BUFFER_END' }
  | { type: 'ERROR'; message: string };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  const transitions: Record<PlayerState, Partial<Record<PlayerAction['type'], PlayerState>>> = {
    idle:      { LOAD: 'loading' },
    loading:   { LOADED: 'paused', ERROR: 'error' },
    playing:   { PAUSE: 'paused', BUFFER: 'buffering', ERROR: 'error' },
    paused:    { PLAY: 'playing', LOAD: 'loading' },
    buffering: { BUFFER_END: 'playing', ERROR: 'error' },
    error:     { LOAD: 'loading' },
  };

  return transitions[state]?.[action.type] ?? state; // Invalid transitions are no-ops
}

function VideoPlayer({ contentId }: { contentId: string }) {
  const [state, dispatch] = useReducer(playerReducer, 'idle');

  return (
    <div className="player">
      {state === 'loading' && <Spinner />}
      {state === 'error' && <ErrorOverlay onRetry={() => dispatch({ type: 'LOAD' })} />}
      {state === 'buffering' && <BufferingIndicator />}
      <video ... />
      <PlayerControls state={state} dispatch={dispatch} />
    </div>
  );
}
```

| When to Use                                    | When NOT to Use            |
| ---------------------------------------------- | -------------------------- |
| Video player states                            | Simple show/hide toggle    |
| Multi-step forms / wizards                     | Linear A → B → C flows     |
| Any UI with > 4 states and defined transitions | Components with 1-2 states |

---

## OTT-Specific Patterns (Million-User Scale)

### Content Rail with Virtualization

```tsx
// ✅ Virtualized horizontal rail for 100+ items
import { FixedSizeList as List } from 'react-window';

interface ContentRailProps {
  title: string;
  items: ContentItem[];
  onSelect: (id: string) => void;
  onLoadMore?: () => void;
}

function ContentRail({ title, items, onSelect, onLoadMore }: ContentRailProps) {
  const listRef = useRef<List>(null);

  const handleScroll = useCallback(
    ({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: string }) => {
      if (scrollDirection === 'forward') {
        const maxScroll = items.length * 220 - window.innerWidth;
        if (scrollOffset > maxScroll - 500) onLoadMore?.();
      }
    },
    [items.length, onLoadMore]
  );

  const renderItem = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <ContentCard content={items[index]} onSelect={onSelect} />
      </div>
    ),
    [items, onSelect]
  );

  return (
    <section className="rail">
      <h2>{title}</h2>
      <List
        ref={listRef}
        layout="horizontal"
        height={320}
        width={window.innerWidth}
        itemCount={items.length}
        itemSize={220}
        onScroll={handleScroll}
      >
        {renderItem}
      </List>
    </section>
  );
}
```

### Image Lazy Loading for Poster Art

```tsx
// ✅ Custom hook for lazy image loading with IntersectionObserver
function useLazyImage(src: string, placeholder: string = '/poster-placeholder.webp') {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.onload = () => setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  return { imgRef, loaded, placeholder };
}

function PosterImage({ src, alt }: { src: string; alt: string }) {
  const { imgRef, loaded, placeholder } = useLazyImage(src);
  return (
    <img
      ref={imgRef}
      src={placeholder}
      alt={alt}
      className={`poster ${loaded ? 'poster--loaded' : ''}`}
    />
  );
}
```

### Video Player Integration

```tsx
// ✅ Player wrapper with proper lifecycle management
function useVideoPlayer(videoRef: RefObject<HTMLVideoElement>) {
  const [state, dispatch] = useReducer(playerReducer, 'idle');
  const playerInstanceRef = useRef<ShakaPlayer | null>(null);

  const initialize = useCallback(
    async (streamUrl: string, drmConfig?: DrmConfig) => {
      if (!videoRef.current) return;
      dispatch({ type: 'LOAD' });

      const player = new shaka.Player(videoRef.current);
      playerInstanceRef.current = player;

      if (drmConfig) {
        player.configure('drm.servers', drmConfig.servers);
      }

      player.addEventListener('error', (e: shaka.util.Error) => {
        dispatch({ type: 'ERROR', message: e.message });
      });

      player.addEventListener('buffering', ({ buffering }: { buffering: boolean }) => {
        dispatch({ type: buffering ? 'BUFFER' : 'BUFFER_END' });
      });

      try {
        await player.load(streamUrl);
        dispatch({ type: 'LOADED' });
      } catch (error) {
        dispatch({ type: 'ERROR', message: 'Failed to load stream' });
      }
    },
    [videoRef]
  );

  const destroy = useCallback(() => {
    playerInstanceRef.current?.destroy();
    playerInstanceRef.current = null;
  }, []);

  useEffect(() => () => destroy(), [destroy]);

  return { state, dispatch, initialize, destroy };
}
```

### Multi-Device Responsive Hooks

```tsx
// ✅ Device-aware layout hook for OTT multi-device support
type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv';

function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detect = () => {
      const w = window.innerWidth;
      if (w < 768) setDevice('mobile');
      else if (w < 1024) setDevice('tablet');
      else if (w < 1920 || !matchMedia('(pointer: coarse)').matches) setDevice('desktop');
      else setDevice('tv');
    };

    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  return device;
}

// ✅ Grid columns by device
function useGridColumns(): number {
  const device = useDeviceType();
  const columns: Record<DeviceType, number> = { mobile: 2, tablet: 4, desktop: 6, tv: 8 };
  return columns[device];
}
```

### Real-Time Subscription Updates

```tsx
// ✅ WebSocket hook for live EPG / sports scores / chat
function useWebSocket<T>(url: string, onMessage: (data: T) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as T;
      onMessageRef.current(data);
    };

    ws.onclose = () => {
      // Auto-reconnect with backoff
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = new WebSocket(url);
        }
      }, 3000);
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [url]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { send };
}
```

### CDN Failover Pattern

```tsx
// ✅ Image/thumbnail with CDN failover
function useCdnImage(contentId: string, cdnUrls: string[]) {
  const [cdnIndex, setCdnIndex] = useState(0);
  const currentUrl = `${cdnUrls[cdnIndex]}/thumbnails/${contentId}.webp`;

  const handleError = useCallback(() => {
    setCdnIndex((prev) => {
      if (prev < cdnUrls.length - 1) return prev + 1;
      return prev; // All CDNs failed — stay on last
    });
  }, [cdnUrls.length]);

  return { src: currentUrl, onError: handleError };
}
```

### Next.js OTT Page Patterns

```tsx
// ✅ Content detail page with SSR + client hydration
export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  const contentId = params?.id as string;
  const userToken = req.cookies['auth_token'];

  const [content, entitlement] = await Promise.all([
    fetchContent(contentId),
    userToken ? checkEntitlement(userToken, contentId) : Promise.resolve(null),
  ]);

  if (!content) return { notFound: true };

  return {
    props: {
      content,
      isEntitled: entitlement?.entitled ?? false,
    },
  };
};

export default function WatchPage({
  content,
  isEntitled,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Client-side player initialization
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, initialize } = useVideoPlayer(videoRef);

  useEffect(() => {
    if (isEntitled && content.streamUrl) {
      initialize(content.streamUrl, content.drmConfig);
    }
  }, [isEntitled, content.streamUrl]);

  return (
    <div className="watch-page">
      {isEntitled ? (
        <video ref={videoRef} className="player" />
      ) : (
        <SubscriptionPrompt contentTitle={content.title} />
      )}
      <ContentMetadata content={content} />
      <RelatedContent contentId={content.id} />
    </div>
  );
}
```

---

## Performance Checklist (OTT at Scale)

| Technique                                   | Impact                                   | When                             |
| ------------------------------------------- | ---------------------------------------- | -------------------------------- |
| Virtualize content rails (`react-window`)   | Eliminate DOM nodes for off-screen items | Rails with 20+ items             |
| `React.lazy()` + `Suspense` for routes      | Reduce initial bundle 40-60%             | All route-level components       |
| `useMemo` for filtered/sorted content lists | Prevent recomputing on every render      | Lists > 50 items                 |
| `IntersectionObserver` for images           | Load only visible poster art             | All thumbnail grids              |
| `<link rel="preload">` for hero images      | Faster LCP                               | Above-the-fold content           |
| Skeleton screens instead of spinners        | Perceived performance                    | All async content areas          |
| `AbortController` on navigation             | Cancel stale API requests                | SPA route changes                |
| Web Workers for heavy computation           | Unblock main thread                      | Search indexing, data transforms |

utils/ # Pure utility functions
pages/
api/ # Next.js API routes
index.tsx # Home page
\_app.tsx # App wrapper
\_document.tsx # HTML document customization

```

**Convention:** One component per file. Name the file the same as the component. Co-locate styles in a `styles/` subfolder next to the component.
```
