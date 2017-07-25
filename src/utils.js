/* Utility Methods */

function functionName(fun) {
  var ret = fun.toString();
  ret = ret.substr("function ".length);
  ret = ret.substr(0, ret.indexOf("("));
  return ret;
}

export function log(thingToLog, ...etc) {
  if (typeof thingToLog === "string") {
    console.log(`- ${thingToLog}`);
  } else if (typeof thingToLog === "function") {
    console.log(functionName(thingToLog), thingToLog);
  } else {
    console.log(thingToLog.toString(), thingToLog);
  }
}
