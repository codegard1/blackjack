import React, { Component } from "react";
import "./App.css";
import "office-ui-fabric-react/dist/css/fabric.min.css";

import { Table } from "./Table";

class App extends Component {
  render() {
    return (
      <div className="App">
        <Table />
      </div>
    );
  }
}

export default App;
