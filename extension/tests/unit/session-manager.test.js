/**
 * Session Manager - Unit Tests
 *
 * Tests session lifecycle (start/stop), step recording, metadata
 * generation, and name management.
 *
 * @see lib/session-manager.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startSession, stopSession, addStep, getState,
  isRecording, setName, getCaptureMetadata, reset,
} from '#lib/session/session-manager.js';

beforeEach(() => {
  reset();
});

describe('session lifecycle', () => {
  it('(+) startSession creates a session with ID and step 0', () => {
    const state = startSession('Login flow');
    expect(state.id).toMatch(/^ses_\d+$/);
    expect(state.name).toBe('Login flow');
    expect(state.step).toBe(0);
  });

  it('(+) isRecording returns true after start', () => {
    startSession();
    expect(isRecording()).toBe(true);
  });

  it('(-) isRecording returns false before start', () => {
    expect(isRecording()).toBe(false);
  });

  it('(+) stopSession returns summary and clears state', () => {
    startSession('Test');
    addStep();
    addStep();
    const result = stopSession();
    expect(result.totalSteps).toBe(2);
    expect(result.name).toBe('Test');
    expect(isRecording()).toBe(false);
  });

  it('(-) stopSession returns null when no session', () => {
    expect(stopSession()).toBeNull();
  });

  it('(+) name defaults to empty string', () => {
    const state = startSession();
    expect(state.name).toBe('');
  });
});

describe('step recording', () => {
  it('(+) addStep increments step counter', () => {
    startSession();
    const s1 = addStep();
    expect(s1.step).toBe(1);
    const s2 = addStep();
    expect(s2.step).toBe(2);
  });

  it('(+) addStep records optional note', () => {
    startSession();
    const s = addStep('Clicked checkout');
    expect(s.note).toBe('Clicked checkout');
  });

  it('(-) addStep without note has undefined note', () => {
    startSession();
    const s = addStep();
    expect(s.note).toBeUndefined();
  });

  it('(-) addStep returns null when no session', () => {
    expect(addStep('test')).toBeNull();
  });

  it('(+) getState reflects current step', () => {
    startSession();
    addStep();
    addStep();
    addStep();
    expect(getState().step).toBe(3);
  });
});

describe('capture metadata', () => {
  it('(+) getCaptureMetadata returns session info for current step', () => {
    startSession('Checkout');
    addStep('Added item');
    const meta = getCaptureMetadata();
    expect(meta.id).toMatch(/^ses_/);
    expect(meta.name).toBe('Checkout');
    expect(meta.step).toBe(1);
    expect(meta.note).toBe('Added item');
  });

  it('(-) getCaptureMetadata returns null when no session', () => {
    expect(getCaptureMetadata()).toBeNull();
  });

  it('(+) metadata omits name when empty', () => {
    startSession();
    addStep();
    const meta = getCaptureMetadata();
    expect(meta.name).toBeUndefined();
  });

  it('(+) metadata omits note when not provided', () => {
    startSession('Test');
    addStep();
    const meta = getCaptureMetadata();
    expect(meta.note).toBeUndefined();
  });
});

describe('name management', () => {
  it('(+) setName updates session name', () => {
    startSession();
    setName('Updated name');
    expect(getState().name).toBe('Updated name');
  });

  it('(-) setName does nothing when no session', () => {
    setName('test');
    expect(getState()).toBeNull();
  });
});
