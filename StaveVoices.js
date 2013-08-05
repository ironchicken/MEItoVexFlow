/* 
* StaveVoices.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 25.07.2013
* 
* Stores all voices in a given measure along with the respective staff id.
* Passes all voices to Vex.Flow.Formatter and calls joinVoices, then draws all voices.
*/


MEI2VF.StaffVoice = function(voice, staff_n) {
  this.voice = voice;
  this.staff_n = staff_n;
}

MEI2VF.StaveVoices = function() {
  this.all_voices = new Array();
}
MEI2VF.StaveVoices.prototype.addStaffVoice = function(staffVoice) {
  this.all_voices.push(staffVoice);
}

MEI2VF.StaveVoices.prototype.addVoice = function(voice, staff_n) {
  this.addStaffVoice(new MEI2VF.StaffVoice(voice, staff_n));
}

MEI2VF.StaveVoices.prototype.reset = function() {
  this.all_voices = [];
}

MEI2VF.StaveVoices.prototype.format = function(width) {
  var voices = $.map(this.all_voices, function(staffVoice, i) {
    return staffVoice.voice;
  });
  var formatter = new Vex.Flow.Formatter();
  //formatter.joinVoices(voices).format(voices, width);
  formatter.format(voices, width);
}

MEI2VF.StaveVoices.prototype.draw = function (context, staves) {
  var all_voices = this.all_voices;
  var staffVoice;
  for (var i=0; i<all_voices.length; ++i) {
    staffVoice = all_voices[i];
    staffVoice.voice.draw(context, staves[staffVoice.staff_n]);
  }
}