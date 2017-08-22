import { Component } from "react";

class BaseComponent extends Component {
  _bind(...methods) {
    methods.forEach(method => {
      if (this[method]) { this[method] = this[method].bind(this); }
      else {
        console.log(`Error: method ${method} was not found`);
      }
    });
  }
}

export default BaseComponent;
