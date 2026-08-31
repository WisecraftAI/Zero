import { configureStore } from '@reduxjs/toolkit';
import { opsApi } from './opsApi';
import { runsApi } from './runsApi';
import { settingsApi } from './settingsApi';

export const store = configureStore({
  reducer: {
    [runsApi.reducerPath]: runsApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
    [opsApi.reducerPath]: opsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      runsApi.middleware,
      settingsApi.middleware,
      opsApi.middleware,
    ),
});
