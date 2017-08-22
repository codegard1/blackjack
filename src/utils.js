/* Utility Methods */

function functionName(fun) {
  var ret = fun.toString();
  ret = ret.substr("function ".length);
  ret = ret.substr(0, ret.indexOf("("));
  return ret;
}

export function log(thingToLog, ...etc) {
  switch (typeof thingToLog) {
    case "string":
      console.log(`- ${thingToLog}`);
      break;

    case "function":
      console.log(functionName(thingToLog), thingToLog);
      break;

    case "object":
      console.log(`${thingToLog}: ${JSON.stringify(thingToLog)}`);
      break;

    default:
      console.log(thingToLog.toString(), thingToLog);
      break;
  }
}

let _counter = 1;
export const Counter = {
  increment() {
    return "id-" + String(_counter++);
  }
};
