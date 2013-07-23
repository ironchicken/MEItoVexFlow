/* 
* StaveConnector.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 24.07.2013
* 
* Contains information about a stave connector parsed from the staffGrp elements 
* and their @symbol attributes
*/

MEI2VF.StaveConnector = function(symbol, top_staff_n, bottom_staff_n) {
  this.init(symbol, top_staff_n, bottom_staff_n);
}

MEI2VF.StaveConnector.prototype.init = function(symbol, top_staff_n, bottom_staff_n) {
  this.symbol = symbol;
  this.top_staff_n = top_staff_n;
  this.bottom_staff_n = bottom_staff_n;
}

MEI2VF.StaveConnector.prototype.vexType = function() {
  switch (this.symbol) {
    case 'line': return Vex.Flow.StaveConnector.type.SINGLE;
    case 'brace': return Vex.Flow.StaveConnector.type.BRACE;
    case 'bracket': return Vex.Flow.StaveConnector.type.BRACKET;
    case 'none': return null;
    default: return Vex.Flow.StaveConnector.type.SINGLE;
  }
}
