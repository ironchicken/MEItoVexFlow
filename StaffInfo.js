/* 
* StaffInfo.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 03.07.2013
* 
* Contains the staff definition and the rendering information (i.e. what clef modifiers are to be rendered)
*/

MEI2VF.StaffInfo = function(staffdef, w_clef, w_keysig, w_timesig) {
  this.renderWith = { clef: w_clef, keysig: w_keysig, timesig: w_timesig };
  this.staffDef = staffdef;
}

MEI2VF.StaffInfo.prototype.look4changes = function (current_staffDef, new_staffdef) {
  Vex.LogDebug('look4changes() {1}')
  var result = { clef:false, keysig:false, timesig:false };
  if (!current_staffDef && new_staffdef) {
    Vex.LogDebug('look4changes() {1}.{A}')
    result.clef = true;
    result.keysig = true;
    result.keysig = true;
    return result;
  } else if (current_staffDef && !new_staffDef) {
    Vex.LogDebug('look4changes() {1}.{B}')
    result.clef = false;
    result.keysig = false;
    result.keysig = false;
    return result;
  } else if (!current_staffDef && !new_staffDef) {
    throw new MEI2VF_RUNTIME_ERROR('BadArgument', 'Cannot compare two undefined staff definitions.')
  }
  Vex.LogDebug('look4changes() {2}')
  var cmp_attr = function(e1, e2, attr_name) { return $(e1).attr(attr_name) === $(e2).attr(attr_name) };
  if (!cmp_attr(current_staffDef, new_staffdef, 'clef.shape') || !cmp_attr(current_staffDef, new_staffdef, 'clef.line')) {
    Vex.LogDebug('look4changes() {2}.{A}')
    result.clef = true;
  } 
  if (!cmp_attr(current_staffDef, new_staffdef, 'key.pname') || !cmp_attr(current_staffDef, new_staffdef, 'key.accid')) {
    Vex.LogDebug('look4changes() {2}.{B}')
    result.keysig = true;
  } 
  if (!cmp_attr(current_staffDef, new_staffdef, 'meter.count') || !cmp_attr(current_staffDef, new_staffdef, 'meter.unit')) {
    Vex.LogDebug('look4changes() {2}.{C}')
    result.keysig = true;
  }
  Vex.LogDebug('look4changes() {3}')
  return result;
}


MEI2VF.StaffInfo.prototype.updateDef = function(staffdef) {
  Vex.LogDebug('StaffInfo.addDef() {1}')
  this.renderWith = look4changes(staffDef, staffdef);
  this.staffDef = staffdef;
  Vex.LogDebug('StaffInfo.addDef() {2}')  
}
