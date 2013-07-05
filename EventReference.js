/* 
* EventReference.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents and event with its xmlid, but if the xmlid is not defined, 
* it can also hold the timestamp that can be resolved as soon as the context that 
* holds the event is established. When the tstamp reference is being resolved, 
* the xml:id is calculated using the generic function tstamp2id(), then the xml:id stored, 
* thus marking that the reference is resolved.
*/


MEI2VF.EventReference = function(xmlid) {
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setId = function(xmlid){
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setTStamp = function(tstamp){
  this.tstamp = tstamp;
  if (this.xmlid) {
    this.tryResolveReference(true);
  }
}

MEI2VF.EventReference.prototype.tryResolveReference = function(strict) {
  var tstamp = this.tstamp;
  var meicontext = this.meicontext;
  if (!tstamp) throw new MEI2VF.RUNTIME_ERROR('MEI2VF:RERR:BADARG:EventRef001', 'EventReference: tstamp must be set in order to resolve reference.')
  if (this.meicontext) {
    //look up event corresponding to the given tstamp (strictly or losely)
    //this.xmlid = id;
  } else {
    this.xmlid = null;
  }
}

MEI2VF.EventReference.prototype.getId = function(meicontext, strict) {
  if (this.xmlid) return this.xmlid;
  if (this.tstamp) {
    throw new MEI2VF.RUNTIME_ERROR('MEI2VF:RERR:NOSUP:EventRef002', 'EventReference: resolution of tstamp is not supported');
    this.meicontext = meicontext;
    if (this.meicontext) {
      //look up the closest event to tstamp within this.meicontext and return its ID
      this.tryResolveReference(strict);
      return this.xmlid;
    }
  } 
  return null;
}

MEI2VF.EventReference.prototype.setContext = function(meicontext) {
  this.meicontext = meicontext;
}