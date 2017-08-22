import React, { Component } from "react";
import 'office-ui-fabric-react/dist/css/fabric.min.css';
import "./App.css";

import Table from "./Table";



class App extends Component {
  render() {
    return (
      <div id="App">
        <Table />
      </div>
    );
  }
}

export default App;
