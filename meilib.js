/*
* MeiLib - General purpose JavaScript functions for processing MEI documents.
* 
* meilib.js
*
* Author: Zoltan Komives <zolaemil@gmail.com>
* Created: 05.07.2013
* 
*/


var MeiLib = {};

MeiLib.RuntimeError = function (errorcode, message) {
  this.errorcode = errorcode;
  this.message = message;
}

MeiLib.RuntimeError.prototype.toString = function() {
  return 'MeiLib.RuntimeError: ' + this.errorcode + ': ' + this.message?this.message:"";
}

/*
* Calculates a timestamp value for an event in a given context.
*
*   @eventid: xml:id of the event
*   @context: array of contextual objects {layer, meter}. time signature is mandatory for the first one.
*
*   @returns: the total duration (in beats - in relation to the meter of the target measure) of all events 
*             that happened before the given event in the given context. 
*/
MeiLib.id2tstamp = function (eventid, context) {
  var meter;
  var found = false;
  for (var i=0; i<context.length && !found; ++i) {   
    Vex.LogDebug('<<<< Measure ' + i + " >>>>");
    Vex.LogDebug('id2tstamp(): {a.1}');
    if (context[i].meter) meter = context[i].meter;
    if (i===0 && !meter) throw new MeiLib.RuntimeError('MeiLib.E001', 'No time signature specified');

    var result = MeiLib.sumUpUntil(eventid, context[i].layer, meter);
    if (result.found) {
      Vex.LogDebug('id2tstamp(): {a}.{b}');
      found = true;
      return i.toString() + 'm' + '+' + (result.beats+1).toString();
    } 
    Vex.LogDebug('id2tstamp(): {a.end}');
  }
  throw new MeiLib.RuntimeError('MeiLib.E002', 'No event with xml:id="' + eventid + '" was found in the given MEI context.');
};


/*
* 
* @return: an object { beats:number, found:boolean } where 
*             1. 'found' is true and 'beats' is the total duration of the events that happened before the 
*                 event with 'eventid' within 'layer', or
*             2. 'found' is false and 'beats is the total duration of the events in 'layer'. 

*       
*/
MeiLib.sumUpUntil = function(eventid, layer, meter) {
  
  //Calculate relative duration to time signature (nuber of beats)
  var dur2beats = function(dur) {
    return (1/dur * meter.unit);
  }
  
  //TODO: return { beats, found } ??? d
  var sumUpUntil_inNode = function(node_elem) {
    var node = $(node_elem);
    var node_name = node.prop('localName');
    Vex.LogDebug('sumUpUntil_inNode() {.1} looking for eventid: ' + eventid + ' node_name: ' + node_name)
    if (node_name === 'note' || node_name === 'rest') { 
      //TODO: dotted value!
      Vex.LogDebug('sumUpUntil_inNode() {.2} node.xml:id=' + node.attr('xml:id'));
      if (node.attr('xml:id') === eventid) {
        Vex.LogDebug('sumUpUntil_inNode() {A}: beats:' + 0);
        return { beats:0, found:true };
      } else {
        Vex.LogDebug('sumUpUntil_inNode() {B}');
        var dur = Number(node.attr('dur'));
        if (!dur) throw new MeiLib.RuntimeError('MeiLib.E003', "Duration is not a number ('breve' and 'long' are not supported).");
        var dots = Number(node.attr('dots'));
        //TODO: dots
        var beats = dur2beats(dur);
        Vex.LogDebug('sumUpUntil_inNode() {B.end}: beats:' + beats);
        return { beats:beats, found:false };
      }
    } else if (node_name === 'mRest') {
      Vex.LogDebug('sumUpUntil_inNode() {C}');
      if (node.attr('xml:id') === eventid) {
        Vex.LogDebug('sumUpUntil_inNode() {C}.{a}: beats:' + 0);
        found = true;
        return { beats:0, found:true };
      } else {
        Vex.LogDebug('sumUpUntil_inNode() {C}.{b}: beats:' + meter.count);
        return { beats:meter.count, found:false }; //the duration of a whole bar expressed in number of beats.
      }
    } else if (node_name === 'layer' || node_name === 'beam') {
      Vex.LogDebug('sumUpUntil_inNode() {D.1}');
      
      //sum up childrens' duration
      var beats = 0;
      var children = node.children();
      var found = false;
      for (var i=0; i<children.length && !found; ++i) {
        Vex.LogDebug('sumUpUntil_inNode() {D}.{a}');
        var subtotal = sumUpUntil_inNode(children[i]);
        beats += subtotal.beats;
        found = subtotal.found;
      }
      Vex.LogDebug('sumUpUntil_inNode() {D.2}: beats: ' + beats + ' found:' + found);
      return { beats:beats, found:found };
    } else if (node_name === 'chord') {
      Vex.LogDebug('sumUpUntil_inNode() {E}');
      var chord_dur = node.attr('dur'); 
      if (node.attr('xml:id')===eventid) {
        Vex.LogDebug('sumUpUntil_inNode() {E}.{a}: beats:' + 0);
        return { beats:0, found:true };
      } else {        
        Vex.LogDebug('sumUpUntil_inNode() {E}.{b}');
        //... or find the longest note in the chord ????
        var chord_dur = node.attr('dur'); 
        if (chord_dur) { 
          Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{i}');
          if (node.find("[xml\\:id='" + eventid + "']")) {
            Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{i}.{x}: beats:' + 0);
            return { beats:0, found:true };
          } else {
            Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{i.2}: beats:' + dur2beats(chord_dur));
            return { beats:dur2beats(chord_dur), found:found };
          }        
        } else {
          Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{ii.1}');
          var children = node.children();
          var found = false;
          for (var i=0; i<children.length && !found; ++i) {
            Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{ii}.{A}');
            var subtotal = sumUpUntil_inNode(children[i]);
            beats = subtotal.beats;
            found = subtotal.found;
          }
          Vex.LogDebug('sumUpUntil_inNode() {E}.{b}.{ii.2}: beats:' + beats.toString());
          return { beats:beats, found:found };            
        }
      };
    }    
    return { beats:0, found:false };
  }


  Vex.LogDebug('sumUpUntil() {1} looking for eventid: ' + eventid);
  return sumUpUntil_inNode(layer);  
}

