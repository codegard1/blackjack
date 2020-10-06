import React from 'react';
import ReactDOM from 'react-dom';
import Table from "./components/blackjack/Table";
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<Table />, document.getElementById('root'));

// Register the serviceworker
serviceWorker.register();