import React from 'react';
import ReactDOM from 'react-dom';
import Table from "./components/blackjack/Table";

// Register the serviceworker
import * as serviceWorker from "./serviceWorker";
serviceWorker.register();

ReactDOM.render(<Table />, document.getElementById('root'));
