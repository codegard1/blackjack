import React, { Component } from "react";
import logo from './logo.svg';
import "./App.css";

import { Deck } from "./Deck";

class App extends Component {
  render() {
    return (
      <div className="App">
        <p className="App-intro">
          <Deck />
        </p>
      </div>
    );
  }
}

export default App;
