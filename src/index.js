import React from 'react';
import ReactDOM from 'react-dom';
import Table from "./components/blackjack/Table";
import * as serviceWorker from './serviceWorker';
import { get, set } from 'idb-keyval';

ReactDOM.render(<Table />, document.getElementById('root'));

// Register the serviceworker
serviceWorker.register();

// test idb-keyval
async function testIDBKeyval() {
  await set('hello', 'world'); // String
  await set('number', 42); // Number
  await set('json', { "ID": 1, "Title": "Test" }); // JSON
  await set('array', ["Alex","Jason","Philip"]); // Array

  const val1 = await get('hello');
  console.log(`When we queried for 'hello' we found ${val1}.`);

  const val2 = await get('number');
  console.log(`When we queried for 'number' we found ${val2}.`);
  
  const val3 = await get('json');
  console.log(`When we queried for 'json' we found ${val3}.`);
  
  const val4 = await get('array');
  console.log(`When we queried for 'array' we found ${val4}.`);
}

testIDBKeyval();
