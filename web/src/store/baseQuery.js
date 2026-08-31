import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE } from '../apiBase';

export const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
});
