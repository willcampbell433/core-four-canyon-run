import test from "node:test";
import assert from "node:assert/strict";
import { createSharedStore } from "../shared-store.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null,
  };
}

const serverSnapshot = {
  trip: { id: "trip-1", slug: "fab-five-2026-08-08", title: "The Fab Five" },
  tripState: {
    trip_id: "trip-1",
    status: "underway",
    active_destination: "Barnegat Ridge South",
    return_note: "Late afternoon",
  },
  entries: [
    {
      id: "entry-1",
      trip_id: "trip-1",
      time_label: "6:00 AM",
      entry_type: "Boat life",
      method: "Running",
      angler: null,
      moment: "Heading offshore",
      created_at: "2026-08-08T10:00:00Z",
    },
  ],
};

test("missing client starts in local-only mode with seeds", async () => {
  const store = createSharedStore({
    client: null,
    storage: memoryStorage(),
    seeds: serverSnapshot.entries,
  });

  await store.start();

  assert.equal(store.getSnapshot().syncState, "local-only");
  assert.deepEqual(store.getSnapshot().entries, serverSnapshot.entries);
});

test("local-only edits persist without creating an unreplayable queue", async () => {
  const storage = memoryStorage();
  const store = createSharedStore({
    client: null,
    storage,
    seeds: serverSnapshot.entries,
    uuid: () => "local-entry",
  });
  await store.start();

  await store.addEntry({
    time_label: "7:30 AM",
    entry_type: "Quote",
    method: "Other",
    moment: "Local fallback still works",
  });

  assert.equal(store.getSnapshot().syncState, "local-only");
  assert.equal(store.getSnapshot().queuedCount, 0);
  assert.equal(storage.read("ofishal-business-shared-queue-v1"), null);
  assert.match(storage.read("ofishal-business-shared-cache-v1"), /Local fallback still works/);
});

test("cached snapshot renders before server load and is replaced", async () => {
  let resolveLoad;
  const cached = { ...serverSnapshot, entries: [{ ...serverSnapshot.entries[0], id: "cached" }] };
  const storage = memoryStorage({
    "ofishal-business-shared-cache-v1": JSON.stringify(cached),
  });
  const client = {
    load: () => new Promise((resolve) => (resolveLoad = resolve)),
    subscribe: () => () => {},
  };
  const store = createSharedStore({ client, storage });

  const starting = store.start();
  assert.equal(store.getSnapshot().entries[0].id, "cached");
  resolveLoad(serverSnapshot);
  await starting;

  assert.equal(store.getSnapshot().entries[0].id, "entry-1");
  assert.equal(store.getSnapshot().syncState, "synced");
});

test("offline create is durable and replays once with its client UUID", async () => {
  const storage = memoryStorage();
  let isOnline = false;
  const mutations = [];
  const client = {
    load: async () => serverSnapshot,
    subscribe: () => () => {},
    mutate: async (mutation) => mutations.push(mutation),
  };
  const store = createSharedStore({
    client,
    storage,
    online: () => isOnline,
    uuid: () => "entry-offline",
  });
  await store.start();

  await store.addEntry({
    time_label: "7:00 AM",
    entry_type: "Catch",
    method: "Jig",
    angler: "Will",
    moment: "Bluefin at the rail",
  });

  assert.equal(store.getSnapshot().syncState, "offline");
  assert.equal(store.getSnapshot().queuedCount, 1);
  assert.match(storage.read("ofishal-business-shared-queue-v1"), /entry-offline/);

  isOnline = true;
  await store.replayQueue();
  await store.replayQueue();

  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].row.id, "entry-offline");
  assert.equal(store.getSnapshot().syncState, "synced");
});

test("provided deterministic import UUID is preserved", async () => {
  const mutations = [];
  const store = createSharedStore({
    client: {
      load: async () => serverSnapshot,
      subscribe: () => () => {},
      mutate: async (mutation) => mutations.push(mutation),
    },
    storage: memoryStorage(),
  });
  await store.start();

  await store.addEntry({
    id: "11111111-1111-4111-8111-111111111111",
    time_label: "Imported",
    entry_type: "Quote",
    method: "Other",
    moment: "Publish once",
  });

  assert.equal(mutations[0].row.id, "11111111-1111-4111-8111-111111111111");
});

test("queued create update delete replay in original order", async () => {
  let isOnline = false;
  const mutations = [];
  const store = createSharedStore({
    client: {
      load: async () => serverSnapshot,
      subscribe: () => () => {},
      mutate: async (mutation) => mutations.push(mutation.kind),
    },
    storage: memoryStorage(),
    online: () => isOnline,
    uuid: () => "entry-ordered",
  });
  await store.start();
  await store.addEntry({
    time_label: "7:15 AM",
    entry_type: "Boat life",
    method: "Running",
    moment: "First draft",
  });
  await store.updateEntry("entry-ordered", { moment: "Edited draft" });
  await store.deleteEntry("entry-ordered");
  isOnline = true;

  await store.replayQueue();

  assert.deepEqual(mutations, ["create-entry", "update-entry", "delete-entry"]);
  assert.equal(store.getSnapshot().entries.some((entry) => entry.id === "entry-ordered"), false);
});

test("realtime events reconcile rows by ID without duplicate echoes", async () => {
  let receive;
  const store = createSharedStore({
    client: {
      load: async () => serverSnapshot,
      subscribe: (handler) => {
        receive = handler;
        return () => {};
      },
    },
    storage: memoryStorage(),
  });
  await store.start();

  receive({ table: "trip_log_entries", eventType: "INSERT", new: serverSnapshot.entries[0] });
  assert.equal(store.getSnapshot().entries.length, 1);
  receive({
    table: "trip_log_entries",
    eventType: "UPDATE",
    new: { ...serverSnapshot.entries[0], moment: "Updated remotely" },
  });
  assert.equal(store.getSnapshot().entries[0].moment, "Updated remotely");
  receive({ table: "trip_log_entries", eventType: "DELETE", old: { id: "entry-1" } });
  assert.equal(store.getSnapshot().entries.length, 0);
});

test("trip state realtime updates preserve local-only GPS boundary", async () => {
  let receive;
  const store = createSharedStore({
    client: {
      load: async () => serverSnapshot,
      subscribe: (handler) => {
        receive = handler;
        return () => {};
      },
    },
    storage: memoryStorage(),
  });
  await store.start();
  receive({
    table: "trip_state",
    eventType: "UPDATE",
    new: { ...serverSnapshot.tripState, active_destination: "Seaside Lumps" },
  });

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.tripState.active_destination, "Seaside Lumps");
  assert.doesNotMatch(JSON.stringify(snapshot), /latitude|longitude|coordinates/);
});

test("a rejected trip-state update is rolled back and cannot poison later saves", async () => {
  const mutations = [];
  let rejectNextMutation = true;
  const store = createSharedStore({
    client: {
      load: async () => serverSnapshot,
      subscribe: () => () => {},
      mutate: async (mutation) => {
        mutations.push(mutation);
        if (rejectNextMutation) {
          rejectNextMutation = false;
          throw new Error('new row violates check constraint "trip_state_return_note_check"');
        }
      },
    },
    storage: memoryStorage(),
  });
  await store.start();

  await store.updateTripState({ return_note: "" });

  assert.equal(store.getSnapshot().queuedCount, 0);
  assert.equal(store.getSnapshot().syncState, "synced");
  assert.equal(store.getSnapshot().tripState.return_note, "Late afternoon");
  assert.equal(store.getSnapshot().error, "That update contains an invalid or oversized value.");

  await store.updateTripState({
    status: "fishing",
    active_destination: "Barnegat Ridge South",
    return_note: "Late afternoon, exact time TBD",
  });

  assert.equal(mutations.length, 2);
  assert.equal(store.getSnapshot().queuedCount, 0);
  assert.equal(store.getSnapshot().syncState, "synced");
  assert.equal(store.getSnapshot().error, null);
});
