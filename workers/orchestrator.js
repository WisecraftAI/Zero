#!/usr/bin/env node
/**
 * Orchestrator worker entrypoint.
 * Same process as the API is the default (npm start). This file exists so a
 * second container can run only the subscriber: ORCHESTRATOR_ONLY=1.
 *
 * Local queue is in-process — a split worker only receives messages when
 * ZERO_CLOUD provides a shared queue (M7). Until then, run with the API.
 */

"use strict";

process.env.ORCHESTRATOR_ONLY = process.env.ORCHESTRATOR_ONLY || "1";
require("../server.js");
