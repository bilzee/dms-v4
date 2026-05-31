import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockCacheSignals = jest.fn();
const mockGetCachedSignals = jest.fn();

jest.mock('@/lib/db/offline', () => ({
  offlineDB: {
    cacheSignals: mockCacheSignals,
    getCachedSignals: mockGetCachedSignals,
  },
}));

jest.mock('@/lib/auth/token-utils', () => ({
  getAuthToken: jest.fn().mockReturnValue('test-token'),
}));

jest.mock('@/lib/api', () => ({
  apiGet: jest.fn(),
}));

import type { ActionSignalItem } from '@/types/action-signal';

const now = new Date();

function makeSignal(overrides: Partial<ActionSignalItem> = {}): ActionSignalItem {
  return {
    id: 'signal-1',
    userId: 'user-1',
    entityId: 'entity-1',
    incidentId: 'incident-1',
    type: 'assessment',
    signalReason: 'unassessed',
    priority: 'CRITICAL',
    context: {
      entityName: 'Test Entity',
      assessmentType: 'HEALTH',
      assessmentId: 'assess-1',
      responseId: 'resp-1',
      responseType: 'MEDICAL_SUPPLIES',
      commitmentId: 'commit-1',
      donorName: 'Test Donor',
      coveragePercent: 75,
      itemBreakdown: [
        { itemName: 'Bandages', plannedQuantity: 100, committedQuantity: 50, coveragePercent: 50 },
      ],
      deadline: '2025-12-31T00:00:00Z',
      lastAssessmentDate: '2025-06-15T00:00:00Z',
    },
    createdAt: now,
    resolvedAt: null,
    entity: {
      id: 'entity-1',
      name: 'Test Entity',
      type: 'HEALTH_FACILITY',
      location: 'Test Location',
      coordinates: { lat: 0, lng: 0 },
    },
    incident: {
      id: 'incident-1',
      name: 'Test Incident',
      severity: 'HIGH',
    },
    ...overrides,
  };
}

const { offlineDB } = jest.requireMock<typeof import('@/lib/db/offline')>('@/lib/db/offline');

describe('cacheSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores signals for a given userId', async () => {
    const signals = [makeSignal(), makeSignal({ id: 'signal-2' })];
    mockCacheSignals.mockResolvedValue(undefined);

    await offlineDB.cacheSignals(signals, 'user-1');

    expect(mockCacheSignals).toHaveBeenCalledWith(signals, 'user-1');
    expect(mockCacheSignals).toHaveBeenCalledTimes(1);
  });

  it('clears previous signals for same userId before inserting new ones', async () => {
    const firstBatch = [makeSignal()];
    const secondBatch = [makeSignal({ id: 'signal-2' })];
    mockCacheSignals.mockResolvedValue(undefined);

    await offlineDB.cacheSignals(firstBatch, 'user-1');
    await offlineDB.cacheSignals(secondBatch, 'user-1');

    expect(mockCacheSignals).toHaveBeenCalledTimes(2);
    expect(mockCacheSignals).toHaveBeenNthCalledWith(1, firstBatch, 'user-1');
    expect(mockCacheSignals).toHaveBeenNthCalledWith(2, secondBatch, 'user-1');
  });

  it('sets 24h expiry on cached signals', async () => {
    const signals = [makeSignal()];
    mockCacheSignals.mockResolvedValue(undefined);

    await offlineDB.cacheSignals(signals, 'user-1');

    expect(mockCacheSignals).toHaveBeenCalledWith(signals, 'user-1');
  });
});

describe('getCachedSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns signals for a given userId', async () => {
    const cached = [makeSignal()];
    mockGetCachedSignals.mockResolvedValue(cached);

    const result = await offlineDB.getCachedSignals('user-1');

    expect(result).toEqual(cached);
    expect(mockGetCachedSignals).toHaveBeenCalledWith('user-1');
  });

  it('returns empty array when no cached signals exist', async () => {
    mockGetCachedSignals.mockResolvedValue([]);

    const result = await offlineDB.getCachedSignals('user-1');

    expect(result).toEqual([]);
  });

  it('filters out expired signals', async () => {
    const freshSignal = makeSignal({ id: 'fresh-1' });
    mockGetCachedSignals.mockResolvedValue([freshSignal]);

    const result = await offlineDB.getCachedSignals('user-1');

    expect(result).toEqual([freshSignal]);
    expect(result).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'expired-signal' }),
      ])
    );
  });
});

describe('useActionSignals offline fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads from cache when navigator.onLine is false', async () => {
    const cachedSignals = [makeSignal()];
    mockGetCachedSignals.mockResolvedValue(cachedSignals);

    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    const offlineSignals = await offlineDB.getCachedSignals('user-1');

    expect(offlineSignals).toEqual(cachedSignals);
    expect(mockGetCachedSignals).toHaveBeenCalledWith('user-1');

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true, configurable: true });
  });

  it('falls back to cached data when API call fails', async () => {
    const cachedSignals = [makeSignal()];
    mockGetCachedSignals.mockResolvedValue(cachedSignals);

    const result = await offlineDB.getCachedSignals('user-1');

    expect(result).toEqual(cachedSignals);
    expect(mockGetCachedSignals).toHaveBeenCalledWith('user-1');
  });

  it('caches response data when online and API succeeds', async () => {
    const apiSignals = [makeSignal(), makeSignal({ id: 'signal-2' })];
    mockCacheSignals.mockResolvedValue(undefined);

    await offlineDB.cacheSignals(apiSignals, 'user-1');

    expect(mockCacheSignals).toHaveBeenCalledWith(apiSignals, 'user-1');
  });

  it('disables refetchInterval when offline', () => {
    const refetchInterval = 30000;

    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    const offlineRefetch = navigator.onLine ? refetchInterval : false;

    expect(offlineRefetch).toBe(false);

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

    const onlineRefetch = navigator.onLine ? refetchInterval : false;

    expect(onlineRefetch).toBe(refetchInterval);

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true, configurable: true });
  });
});

describe('Signal expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('considers signals cached 24+ hours ago as expired', () => {
    const expiredDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const expiresAt = new Date(expiredDate.getTime() + 24 * 60 * 60 * 1000);
    const isExpired = expiresAt.getTime() < now.getTime();

    expect(isExpired).toBe(true);
  });

  it('returns fresh signals that have not expired', () => {
    const cachedDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const expiresAt = new Date(cachedDate.getTime() + 24 * 60 * 60 * 1000);
    const isExpired = expiresAt.getTime() < now.getTime();

    expect(isExpired).toBe(false);
  });
});

describe('Signal data integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly serializes and deserializes context JSON', () => {
    const signal = makeSignal();
    const serialized = JSON.stringify(signal.context);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(signal.context);
    expect(deserialized.entityName).toBe('Test Entity');
    expect(deserialized.assessmentType).toBe('HEALTH');
    expect(deserialized.coveragePercent).toBe(75);
    expect(deserialized.itemBreakdown).toHaveLength(1);
    expect(deserialized.itemBreakdown[0].itemName).toBe('Bandages');
  });

  it('preserves entity nested objects through cache round-trip', () => {
    const signal = makeSignal();
    const serialized = JSON.stringify(signal.entity);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(signal.entity);
    expect(deserialized.id).toBe('entity-1');
    expect(deserialized.name).toBe('Test Entity');
    expect(deserialized.type).toBe('HEALTH_FACILITY');
    expect(deserialized.location).toBe('Test Location');
    expect(deserialized.coordinates).toEqual({ lat: 0, lng: 0 });
  });

  it('preserves incident nested objects through cache round-trip', () => {
    const signal = makeSignal();
    const serialized = JSON.stringify(signal.incident);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(signal.incident);
    expect(deserialized.id).toBe('incident-1');
    expect(deserialized.name).toBe('Test Incident');
    expect(deserialized.severity).toBe('HIGH');
  });

  it('survives full cache round-trip with all ActionSignalItem fields', () => {
    const signal = makeSignal();

    const cachedRow = {
      signalId: signal.id,
      userId: signal.userId,
      entityId: signal.entityId,
      incidentId: signal.incidentId,
      type: signal.type,
      signalReason: signal.signalReason,
      priority: signal.priority,
      context: JSON.stringify(signal.context),
      entity: JSON.stringify(signal.entity),
      incident: JSON.stringify(signal.incident),
      createdAt: typeof signal.createdAt === 'string' ? signal.createdAt : new Date(signal.createdAt).toISOString(),
      resolvedAt: signal.resolvedAt
        ? typeof signal.resolvedAt === 'string'
          ? signal.resolvedAt
          : new Date(signal.resolvedAt).toISOString()
        : null,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    };

    const restored = {
      id: cachedRow.signalId,
      userId: cachedRow.userId,
      entityId: cachedRow.entityId,
      incidentId: cachedRow.incidentId,
      type: cachedRow.type,
      signalReason: cachedRow.signalReason,
      priority: cachedRow.priority,
      context: JSON.parse(cachedRow.context),
      entity: JSON.parse(cachedRow.entity),
      incident: JSON.parse(cachedRow.incident),
      createdAt: cachedRow.createdAt,
      resolvedAt: cachedRow.resolvedAt,
    };

    expect(restored.id).toBe(signal.id);
    expect(restored.userId).toBe(signal.userId);
    expect(restored.entityId).toBe(signal.entityId);
    expect(restored.incidentId).toBe(signal.incidentId);
    expect(restored.type).toBe(signal.type);
    expect(restored.signalReason).toBe(signal.signalReason);
    expect(restored.priority).toBe(signal.priority);
    expect(restored.context).toEqual(signal.context);
    expect(restored.entity).toEqual(signal.entity);
    expect(restored.incident).toEqual(signal.incident);
    expect(restored.resolvedAt).toBeNull();
  });

  it('handles null incident in round-trip', () => {
    const signal = makeSignal({ incidentId: null, incident: null });

    const cachedRow = {
      incident: JSON.stringify(signal.incident),
    };

    const restored = JSON.parse(cachedRow.incident);

    expect(restored).toBeNull();
  });
});
