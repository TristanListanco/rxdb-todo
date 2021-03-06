import {decode, encode} from 'base-64';
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite';
import SQLite from 'react-native-sqlite-2';
import {addRxPlugin, createRxDatabase} from 'rxdb';
import {RxDBReplicationCouchDBPlugin} from 'rxdb/plugins/replication-couchdb';
import {addPouchPlugin, getRxStoragePouch} from 'rxdb/plugins/pouchdb';

if (!global.btoa) {
  global.btoa = encode;
}
if (!global.atob) {
  global.atob = decode;
}
process.browser = true;

const SQLiteAdapter = SQLiteAdapterFactory(SQLite);

addPouchPlugin(SQLiteAdapter);
addPouchPlugin(require('pouchdb-adapter-http'));
addRxPlugin(RxDBReplicationCouchDBPlugin);

const syncURL = 'https://admin:bmw123@couchdb-dev.buildmywealth.app/'; // Replace localhost with a public ip address!
const dbName = 'tasks';
const todoCollectionURL = `${syncURL}tasks/`;

console.debug('TASKS REMOTE URL: ', todoCollectionURL);

const initializeDB = async () => {
  let db;

  try {
    console.log('Initializing database...');

    // await removeRxDatabase(dbName, getRxStoragePouch("react-native-sqlite"));

    db = await createRxDatabase({
      name: dbName,
      storage: getRxStoragePouch('react-native-sqlite'),
      multiInstance: false,
      ignoreDuplicate: true,
    });

    console.log('Database initialized!');
  } catch (err) {
    console.error('ERROR CREATING DATABASE', err);
  }

  // console.log("Adding todo collection...");

  try {
    await db.addCollections({
      tasks: {
        schema: {
          version: 0,
          title: 'tasks schema',
          description: 'tasks',
          primaryKey: '_id',
          type: 'object',
          keyCompression: false,
          properties: {
            _id: {
              type: 'string',
            },
            text: {
              type: 'string',
            },
            text1: {
              type: 'string',
            },
            completed: {
              type: 'boolean',
            },
          },
          required: ['_id', 'text', 'text1', 'completed'],
        },
      },
    });

    // console.log("Todo collection added!");
    //

    // console.log("Syncing to remote database...");

    const replicationState = await db.collections.tasks.syncCouchDB({
      remote: todoCollectionURL,
      waitForLeadership: true,
      direction: {
        pull: true,
        push: true,
      },
      options: {
        live: true,
        retry: true,
      },
    });

    // console.log("Synced to remote database!");

    replicationState.change$.subscribe(change =>
      console.log('Change: ' + change),
    );
    replicationState.docs$.subscribe(docData => console.log('Doc: ' + docData));
    replicationState.denied$.subscribe(docData =>
      console.error('Denied: ' + docData),
    );
    replicationState.active$.subscribe(active =>
      console.log('Active: ' + active),
    );
    replicationState.alive$.subscribe(alive => console.log('Alive: ' + alive));
    replicationState.complete$.subscribe(completed =>
      console.log('Complete: ' + completed),
    );
    replicationState.error$.subscribe(error =>
      console.error('Error: ' + error),
    );
  } catch (err) {
    console.error('ERROR CREATING COLLECTION', err);
  }

  return db;
};

export default initializeDB;
