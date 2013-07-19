Node.prototype.attrs = function() {
  var i;
  var attrs = {};
  for (i in this.attributes) {
    attrs[this.attributes[i].name] = this.attributes[i].value;
  }
  return attrs;
};

Array.prototype.all = function(test) {
  test = test || function(a) { return a == true; };

  var i;
  for (i = 0; i < this.length; i++) {
    if (test(this[i]) === false) { return false; }
  }
  return true;
};

Array.prototype.any = function(test) {
  test = test || function(a) { return a == true; };

  var i;
  for (i = 0; i < this.length; i++) {
    if (test(this[i]) === true) { return true; }
  }
  return false;
};


MEI2VF = {}

MEI2VF.RUNTIME_ERROR = function(error_code, message) {
  this.error_code = error_code;
  this.message = message;
}

MEI2VF.RUNTIME_ERROR.prototype.toString = function() {
  return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
}

MEI2VF.render_notation = function(score, target, width, height) {
  var width = width || 800;
  var height = height || 350;
  var n_measures = $(score).find('measure').get().length;
  var measure_width = Math.round(width / n_measures);

  var context;
  var measures = [];
  var beams = [];
  var notes = [];
  var notes_by_id = {};
  var ties = [];
  var slurs = [];
  var hairpins = [];
  var unresolvedTStamp2 = [];
  
  var SYSTEM_SPACE = 20;
  var system_top = 0;
  var measure_left = 0;
  var bottom_most = 0;
  var system_n = 0;
  var nb_of_measures = 0; //number of measures already rendered in the current system;
  var system_break = false;
  var new_section = true;
  
  var staffInfoArray = new Array();
  
  var move_to_next_measure = function() {
    if (new_section) {
      nb_of_measures = 0;
      measure_left = 0;      
      new_section = false;
      system_break = false;
      $.each(staffInfoArray, function(i,staff_info) { 
        if (staff_info) {
          staff_info.renderWith.clef = true;
          staff_info.renderWith.keysig = true;
          staff_info.renderWith.timesig = true;          
        }
      });
      // staffInfo.renderWith.clef = true;
      // staffInfo.renderWith.keysig = true;
      // staffInfo.renderWith.timesig = true;
    } else if (system_break) {
      nb_of_measures = 0;
      measure_left = 0;
      system_n += 1;
      system_top = bottom_most + SYSTEM_SPACE;
      system_break = false;
      // staffInfo.renderWith.clef = true;
      // staffInfo.renderWith.keysig = true;
      $.each(staffInfoArray, function(i,staff_info) { 
        if (staff_info) {
          staff_info.renderWith.clef = true;
          staff_info.renderWith.keysig = true;
        }
      });
    } else {
      if (measures[measures.length-1]) {
        var previous_measure = measures[measures.length-1][0];

        measure_left = previous_measure.x + previous_measure.width;      
      } else {
        measure_left = 0;
      }
    }
  }

  var get_attr_value = function(element, attribute) {
    var result = get_attr_value_opt(element, attribute);
    if (!result) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
    return result;
  }

  var get_attr_value_opt = function(element, attribute) {
    var result = $(element).attr(attribute);
    return result;
  }

  var mei_note2vex_key = function(mei_note) {
    mei_note = (typeof mei_note === 'number' &&
                arguments.length === 2 && 
                typeof arguments[1] === 'object') ? arguments[1] : mei_note;

    var pname = $(mei_note).attr('pname');
    var oct = $(mei_note).attr('oct');
    if (!pname  || !oct) {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
    }
    return pname + '/' + oct;
  };

  //Add annotation (lyrics)
  var mei_syl2vex_annot = function(mei_note) {
    var syl = $(mei_note).find('syl'); 
    var full_syl = '';
    $(syl).each(function(i,s){ 
      var dash = ($(s).attr('wordpos')=='i' || $(s).attr('wordpos')=='m') ? '-' : '';
      full_syl += (i>0 ? '\n' : '')+$(s).text()+dash;
    });
    var dash = (syl.attr('wordpos')=='i' || syl.attr('wordpos')=='m') ? '-' : '';
    return full_syl; 
  }
  
  //Add annotation (directions)
  var mei_dir2vex_annot = function(parent_measure, mei_note) {
    var dir = $(parent_measure).find('dir')
    var dir_text = '';
    var pos = '';
    $(dir).each(function(){
      var startid = get_attr_value(this, 'startid');
      var xml_id = get_attr_value(mei_note,'xml:id');
      var place = get_attr_value(this, 'place');
      if (startid === xml_id){
        dir_text += $(this).text().trim();
        pos = place;
      }
    });
    return [dir_text, pos];
  }

  var vex_key_cmp = function(key1, key2) {
    key1 = {pitch: key1.split('/')[0][0], octave: Number(key1.split('/')[1])};
    key2 = {pitch: key2.split('/')[0][0], octave: Number(key2.split('/')[1])};

    if (key1.octave === key2.octave) {
      if (key1.pitch === key2.pitch) { 
        return 0; 
      } else if (key1.pitch < key2.pitch) { 
        return -1; 
      } else if (key1.pitch > key2.pitch) { 
        return 1; 
      }
    } else if (key1.octave < key2.octave) { 
      return -1; 
    } else if (key1.octave > key2.octave) { 
      return 1; 
    }
  }

  var mei_dur2vex_dur = function(mei_dur) {
    mei_dur = String(mei_dur);
    //if (mei_dur === 'long') return ;
    //if (mei_dur === 'breve') return ;
    if (mei_dur === '1') return 'w';
    if (mei_dur === '2') return 'h';
    if (mei_dur === '4') return 'q';
    if (mei_dur === '8') return '8';
    if (mei_dur === '16') return '16';
    if (mei_dur === '32') return '32';
    if (mei_dur === '64') return '64';
    //if (mei_dur === '128') return ;
    //if (mei_dur === '256') return ;
    //if (mei_dur === '512') return ;
    //if (mei_dur === '1024') return ;
    //if (mei_dur === '2048') return ;
    //if (mei_dur === 'maxima') return ;
    //if (mei_dur === 'longa') return ;
    //if (mei_dur === 'brevis') return ;
    //if (mei_dur === 'semibrevis') return ;
    //if (mei_dur === 'minima') return ;
    //if (mei_dur === 'semiminima') return ;
    //if (mei_dur === 'fusa') return ;
    //if (mei_dur === 'semifusa') return ;
    throw new Vex.RuntimeError('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
  };

  var mei_note2vex_dur = function(mei_note, allow_dotted) {
    allow_dotted = allow_dotted || true;

    mei_note = (typeof mei_note === 'number' && 
                arguments.length === 2 && 
                typeof arguments[1] === 'object') ? arguments[1] : mei_note;

    var dur_attr =$(mei_note).attr('dur');
    if (dur_attr === undefined) {
      alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
    }

    var dur = mei_dur2vex_dur(dur_attr);
    if (allow_dotted === true && $(mei_note).attr('dots') === '1') {
      dur += 'd';
    }
    return dur;
    //return mei_dur2vex_dur($(mei_note).attr('dur')) + (allow_dotted === true && $(mei_note).attr('dots') === '1') ? 'd' : '';
    //return mei_dur2vex_dur($(mei_note).attr('dur'));
  };

  var mei_accid2vex_accid = function(mei_accid) {
    if (mei_accid === 'n') return 'n';
    if (mei_accid === 'f') return 'b';
    if (mei_accid === 's') return '#';
    if (mei_accid === 'ff') return 'bb';
    if (mei_accid === 'ss') return '##';
    throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
  };

  var mei_note_stem_dir = function(mei_note, parent_staff_element) {
    var given_dir = $(mei_note).attr('stem.dir');
    if (given_dir !== undefined) {
      return (given_dir === 'up') ? Vex.Flow.StaveNote.STEM_UP : (given_dir === 'down') ? Vex.Flow.StaveNote.STEM_DOWN : undefined;
    } else {
      var clef = staff_clef($(parent_staff_element).attr('n'));
      if (clef === 'treble') {
        return (vex_key_cmp('a/5', mei_note2vex_key(mei_note)) === 1) ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;
      } else if (clef === 'bass') {
        return (vex_key_cmp('c/4', mei_note2vex_key(mei_note)) === -1) ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;
      }
    }
  };

  var mei_staffdef2vex_keyspec = function(mei_staffdef) {
    if ($(mei_staffdef).attr('key.pname') !== undefined) {
      var keyname = $(mei_staffdef).attr('key.pname').toUpperCase();
      var key_accid = $(mei_staffdef).attr('key.accid');
      if (key_accid !== undefined) {
        switch (key_accid) {
          case 's': keyname += '#'; break;
          case 'f': keyname +=  'b'; break;
          default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.UnexpectedAttributeValue', "Value of key.accid must be 's' or 'f'");
        } 
      }
      var key_mode = $(mei_staffdef).attr('key.mode'); 
      if (key_mode !== undefined) {
        keyname += key_mode === 'major' ? '' : 'm';        
      }
      return keyname;
    } else {
      return 'C'
    }
  };

  var mei_staffdef2vex_clef = function(mei_staffdef) {
    var clef_shape = get_attr_value(mei_staffdef, 'clef.shape');
    var clef_line = get_attr_value_opt(mei_staffdef, 'clef.line');
    if (clef_shape === 'G' && (!clef_line || clef_line === '2')) {
      return 'treble';
    } else if (clef_shape === 'F' && (!clef_line || clef_line === '4') ) {
      return 'bass';
    } else {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Clef definition is not supported: [ clef.shape="' + clef_shape + '" ' + (clef_line?('clef.line="' + clef_line + '"'):'') + ' ]' );
    }
  };

  var staff_clef = function(staff_n) {
    var staffdef = $(score).find('staffDef[n=' + staff_n + ']')[0];
    return mei_staffdef2vex_clef(staffdef);
  };

  var mei_staffdef2vex_timespec = function(mei_staffdef) {
    if ($(mei_staffdef).attr('meter.count') !== undefined && $(mei_staffdef).attr('meter.unit') !== undefined) {
      return $(mei_staffdef).attr('meter.count') + '/' + $(mei_staffdef).attr('meter.unit');
    }
  };

  var initialise_score = function(canvas) {
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    context = renderer.getContext();
  };

  var staff_height = function(staff_n) {
    return 100;
  }

  //
  // The Y coordinate of staff #staff_n (within the current system)
  //
  var staff_top_rel = function(staff_n) {
    var result = 0;
    var i;
    for (i=0;i<staff_n-1;i++) result += staff_height(i);
    return result;
  }
  
  //
  // The Y coordinate of staff #staff_n (within the current system)
  //
  var staff_top_abs = function(staff_n){
    var result = system_top + staff_top_rel(staff_n);
    var bottom_most_candidate = result + staff_height(staff_n);
    if (bottom_most_candidate > bottom_most) bottom_most = bottom_most_candidate;
    return result;
  }

  //
  // Initialise staff #staff_n. Render necessary staff modifiers.
  //
  var initialise_staff_n = function(staff_n, width) {
    
    if (!staff_n) {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".')
    }
    
    move_to_next_measure();

//    var staffdef = staffInfo.staffDef(staff_n);
    var staffdef = staffInfoArray[staff_n].staffDef;
        
    if (staffInfoArray[staff_n].renderWith.clef || staffInfoArray[staff_n].renderWith.keysig || staffInfoArray[staff_n].renderWith.timesig) width += 30;
    
    var staff = new Vex.Flow.Stave(measure_left, staff_top_abs(staff_n), width);
    if (staffInfoArray[staff_n].renderWith.clef) {
      staff.addClef(mei_staffdef2vex_clef(staffdef));
      staffInfoArray[staff_n].renderWith.clef = false;
    }
    if (staffInfoArray[staff_n].renderWith.keysig) {
      if ($(staffdef).attr('key.sig.show') === 'true' || $(staffdef).attr('key.sig.show') === undefined) {
        staff.addKeySignature(mei_staffdef2vex_keyspec(staffdef));
      }
      staffInfoArray[staff_n].renderWith.keysig = false;
    }
    if (staffInfoArray[staff_n].renderWith.timesig) {
      if ($(staffdef).attr('meter.rend') === 'norm' || $(staffdef).attr('meter.rend') === undefined) {
        staff.addTimeSignature(mei_staffdef2vex_timespec(staffdef));
      }
      staffInfoArray[staff_n].renderWith.timesig = false;
    }
    staff.setContext(context).draw();
    return staff;
  }

  var initialise_staff = function(staffdef, with_clef, with_keysig, with_timesig, left, top, width) {
    var staff = new Vex.Flow.Stave(left, top, width);
    if (with_clef === true) {
      staff.addClef(mei_staffdef2vex_clef(staffdef));
    }
    if (with_keysig === true) {
      if ($(staffdef).attr('key.sig.show') === 'true' || $(staffdef).attr('key.sig.show') === undefined) {
        staff.addKeySignature(mei_staffdef2vex_keyspec(staffdef));
      }
    }
    if (with_timesig === true) {
      if ($(staffdef).attr('meter.rend') === 'norm' || $(staffdef).attr('meter.rend') === undefined) {
        staff.addTimeSignature(mei_staffdef2vex_timespec(staffdef));
      }
    }
    staff.setContext(context).draw();
    return staff;
  };

  var render_measure_wise = function() {
    var scoredef = $(score).find('scoreDef')[0];
    if (!scoredef) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found.')
    process_scoreDef(scoredef);
    
    $(score).find('section').children().each(process_section_child);
    $.each(beams, function(i, beam) { beam.setContext(context).draw(); });
    //do ties, slurs and hairpins now!
    render_vexTies(ties);
    render_vexTies(slurs);
    render_vexHairpins(hairpins);
  };

  var render_vexTies = function(eventlinks) {
    $(eventlinks).each(function(i, link) {
      var f_note = notes_by_id[link.getFirstId()];
      var l_note = notes_by_id[link.getLastId()];
      
      var f_vexNote; if (f_note) f_vexNote = f_note.vexNote;
      var l_vexNote; if (l_note) l_vexNote = l_note.vexNote;
      new Vex.Flow.StaveTie({
        first_note: f_vexNote,
        last_note: l_vexNote}).setContext(context).draw();
    });
  }

  var render_vexHairpins = function(hairpin_links) {
    
    $(hairpin_links).each(function(i, link) {
      var f_note = notes_by_id[link.getFirstId()];
      var l_note = notes_by_id[link.getLastId()];
      
      var f_vexNote; if (f_note) f_vexNote = f_note.vexNote;
      var l_vexNote; if (l_note) l_vexNote = l_note.vexNote;
      
      var place = mei2vexflowTables.positions[link.hairpinParams.place];
      var type = mei2vexflowTables.hairpins[link.hairpinParams.form];        
      var l_ho = 0;
      var r_ho = 0;
      var hairpin_options = {height: 10, y_shift:0, left_shift_px:l_ho, r_shift_px:r_ho};
  
      new Vex.Flow.StaveHairpin({
        first_note: f_vexNote,
        last_note: l_vexNote,
      }, type).setContext(context).setRenderOptions(hairpin_options).setPosition(place).draw();
    });
  } 

  /*  MEI element <section> may contain (MEI v2.1.0):
  *    MEI.cmn: measure
  *    MEI.critapp: app
  *    MEI.edittrans: add choice corr damage del gap handShift orig reg restore sic subst supplied unclear 
  *    MEI.shared: annot ending expansion pb sb scoreDef section staff staffDef
  *    MEI.text: div
  *    MEI.usersymbols: anchoredText curve line symbol
  *
  *  Supported elements: measure, scoreDef, staffDef
  */
  var process_section_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'measure': 
        extract_staves(child);
        extract_linkingElements(child, 'tie', ties);
        extract_linkingElements(child, 'slur', slurs);
        extract_linkingElements(child, 'hairpin', hairpins);
        break;
      case 'scoreDef': process_scoreDef(child); break;
      case 'staffDef': process_staffDef(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <section>');
    } 
  }
  
  var process_scoreDef = function(scoredef) {
    $(scoredef).children().each(process_scoredef_child);
  }

  /*  MEI element <scoreDef> may contain (MEI v2.1.0):
  *    MEI.cmn: meterSig meterSigGrp
  *    MEI.harmony: chordTable
  *    MEI.linkalign: timeline
  *    MEI.midi: instrGrp
  *    MEI.shared: keySig pgFoot pgFoot2 pgHead pgHead2 staffGrp 
  *    MEI.usersymbols: symbolTable
  * 
  *  Supported elements: staffGrp
  */
  var process_scoredef_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'staffGrp': process_staffGrp(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <scoreDef>');
    }     
  }
  
  var process_staffGrp = function(staffGrp) {
    $(staffGrp).children().each(process_staffGrp_child);
  }
  
  
  /*  MEI element <staffGrp> may contain (MEI v2.1.0):
  *    MEI.cmn: meterSig meterSigGrp MEI.mensural: mensur proport
  *    MEI.midi: instrDef
  *    MEI.shared: clef clefGrp keySig label layerDef
  * 
  *  Supported elements: staffGrp, staffDef
  */
  var process_staffGrp_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'staffDef': process_staffDef(child); break;
      case 'staffGrp': process_staffGrp(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <staffGrp>');
    }    
  }
  
  var process_staffDef = function(staffDef) {
    var staff_n = Number(staffDef.attrs().n);
    var staff_info = staffInfoArray[staff_n];
    if (staff_info) {
      staffInfoArray[staff_n].updateDef(staffDef);
    } else {
      staffInfoArray[staff_n] = new MEI2VF.StaffInfo(staffDef, true, true, true);
    }
  }
  
  var extract_staves = function(measure) {
    measures.push($(measure).find('staff').map(function(i, staff) { return extract_layers(i, staff, measure); }).get());
  };

  var extract_layers = function(i, staff_element, parent_measure) {
    var staff, left, top;
    
    //get current staffDef
    var staff_n = Number(staff_element.attrs().n);
    staff = initialise_staff_n(staff_n, measure_width);

    var layer_events = $(staff_element).find('layer').map(function(i, layer) { 
      return extract_events(i, layer, staff_element, parent_measure); 
    }).get();
    
    // rebuild object by extracting vexNotes before rendering the voice TODO: put in independent function??
    var vex_layer_events = [];
    $(layer_events).each( function() { 
      vex_layer_events.push({ 
        events : $(this.events).get().map( function(events) { 
          return events.vexNote ? events.vexNote : events; 
        }), 
        layer: this.layer
      })
    });

    var voices = $.map(vex_layer_events, function(events) { return make_voice(null, events.events); });
    var formatter = new Vex.Flow.Formatter().joinVoices(voices).format(voices, measure_width).formatToStave(voices, staff);
    $.each(voices, function(i, voice) { voice.draw(context, staff);});

    return staff;
  };

  var extract_events = function(i, layer, parent_staff_element, parent_measure) {
    // check if there's an unresolved TStamp2 reference to this location (measure, staff, layer):
    var measure_n = parent_measure.attrs().n;
    if (!measure_n) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_events:', '<measure> must have @n specified');
    var staff_n = parent_staff_element.attrs().n; if (!staff_n) staff_n = "1";
    var layer_n = layer.attrs().n; if (!layer_n) layer_n = "1";
    var staffdef = staffInfoArray[staff_n].staffDef;
    var refLocationIndex = measure_n + ':' + staff_n + ':' + layer_n;
    if (unresolvedTStamp2[refLocationIndex]) {
      $(unresolvedTStamp2[refLocationIndex]).each(function(i, eventLink) {
        var count = $(staffdef).attr('meter.count');
        var unit = $(staffdef).attr('meter.unit');
        var meter = { count:Number(count), unit:Number(unit) };
        eventLink.setContext( { layer:layer, meter:meter } );
        //TODO: remove eventLink from the list
        unresolvedTStamp2[refLocationIndex][i] = null;
      });
      //at this point all references should be supplied with context.
      unresolvedTStamp2[refLocationIndex] = null;
    }
    // the calling context for this function is always a
    // map(extract_events).get() which will flatten the arrays
    // returned. Therefore, we wrap them up in an object to
    // protect them.
    return {
      layer: i, 
      events: $(layer).children().map(function(i, element) { 
        return process_element(element, layer, parent_staff_element, parent_measure); 
      }).get()};
  };

  /*
  * Extract <tie>, <slur> or <hairpin> elements and create EventLink obejcts
  */
  var extract_linkingElements = function (measure, element_name, eventlink_container) {

    var link_staffInfo = function(lnkelem) {
      var staff_n = lnkelem.attrs().staff;
      if (!staff_n) { staff_n = "1"; } 
      var layer_n = lnkelem.attrs().layer;
      if (!layer_n) { layer_n = "1"; }
      return { staff_n:staff_n, layer_n:layer_n };
    }
   
    //convert tstamp into startid in current measure
    var local_tstamp2id = function(tstamp, lnkelem, measure) {
      var stffinf = link_staffInfo(lnkelem);      
      var staff = $(measure).find('staff[n="' + stffinf.staff_n + '"]');
      var layer = $(staff).find('layer[n="'+ stffinf.layer_n + '"]').get(0);
      if (!layer) {
        var layer_candid = $(staff).find('layer');
        if (layer_candid && !layer_candid.attr('n')) layer = layer_candid;
        if (!layer) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E01', 'Cannot find layer');
      } 
      var staffdef = staffInfoArray[stffinf.staff_n].staffDef;
      if (!staffdef) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E02', 'Cannot determine staff definition.');
      var meter = { count:Number(staffdef.attrs()['meter.count']), unit:Number(staffdef.attrs()['meter.unit']) };
      if (!meter.count || !meter.unit) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
      return MeiLib.tstamp2id(tstamp, layer, meter);      
    }
    
    var measure_partOf = function(tstamp2) {
      var indexOfPlus;
      return tstamp2.substring(0,tstamp2.indexOf('m'));
    }

    var beat_partOf = function(tstamp2) {
      var indexOfPlus;
      return tstamp2.substring(tstamp2.indexOf('+')+1);
    }

    var link_elements = $(measure).find(element_name);
    $.each(link_elements, function(i, lnkelem) {
      
      var eventLink = new MEI2VF.EventLink(null, null);
      if (element_name === 'hairpin') {
        var form = lnkelem.attrs().form;
        if (!form) throw new  MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:extract_linkingElements', '@form is mandatory in <hairpin> - make sure the xml is valid.');
        var place = lnkelem.attrs().place;
        eventLink.setHairpinParams( { form:form, place:place });
      }
      // find startid for eventLink. if tstamp is provided in the element, 
      // tstamp will be calculated.
      var startid = lnkelem.attrs().startid;
      if(startid) {
        eventLink.setFirstId(startid);
      } else {
        var tstamp = lnkelem.attrs().tstamp;
        if (tstamp) {
          startid = local_tstamp2id(tstamp, lnkelem, measure);
          eventLink.setFirstId(startid);
        } else {
          //no @startid, no @tstamp ==> eventLink.first_ref remains empty.
        }
      }

      // find end reference value (id/tstamp) of eventLink:
      var endid = lnkelem.attrs().endid;
      if (endid) {
          eventLink.setLastId(endid);
      } else {
        var tstamp2 = lnkelem.attrs().tstamp2;
        if (tstamp2) {
          var measures_ahead = Number(measure_partOf(tstamp2));
          if (measures_ahead>0) {
            eventLink.setLastTStamp(beat_partOf(tstamp2));
            //register that eventLink needs context;
            //need to save: measure.n, link.staff_n, link.layer_n
            var staffinfo = link_staffInfo(lnkelem);
            var measure_n = measure.attrs().n;
            var tartget_measure_n = Number(measure_n) + measures_ahead;
            var refLocationIndex = tartget_measure_n.toString() + ':' + staffinfo.staff_n + ':' + staffinfo.layer_n;
            if (!unresolvedTStamp2[refLocationIndex]) unresolvedTStamp2[refLocationIndex] = new Array();
            unresolvedTStamp2[refLocationIndex].push(eventLink);
          } else {
            endid = local_tstamp2id(beat_partOf(tstamp2),lnkelem,measure);
            eventLink.setLastId(endid);
          }          
        } else {
          //no @endid, no @tstamp2 ==> eventLink.last_ref remains empty.
        }
      }
      
      eventlink_container.push(eventLink);

    });
  }

  var make_tieslur = function(startid, endid, container) {
    var eventLink = new MEI2VF.EventLink(startid, endid);
    container.push(eventLink);    
  };

  var start_tieslur = function(startid, linkCond, container) {
    var eventLink = new MEI2VF.EventLink(startid, null, linkCond);
    container.push(eventLink);
  }
  
  var terminate_tie = function(endid, pname) {
    if (!pname) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:TermTie01', 'no pitch specified for the tie');
    var found=false
    var i; var tie;
    for(i=0; !found && i<ties.length;++i) {
      tie = ties[i];
      if (!tie.getLastId()) {
        if (tie.linkCond === pname) {
          found=true;
          tie.setLastId(endid);
        } else {
          //in case there's no link condition set for the link, we have to retreive the pitch of the referenced note.
          var note_id = tie.getFirstId();
          if (note_id) {
            var note = notes_by_id[note_id];
            if (note && $(note.meiNote).attr('pname') === pname) {
              found=true;
              tie.setLastId(endid);
            }
          }        
        }
      }
    };
    //if no tie object found that is uncomplete and with the same pitch, 
    //then create a tie that has only endid set.
    if (!found) {
      var tie = new MEI2VF.EventLink(null, endid);
      ties.push(tie);      
    }
  }
  
  var terminate_slur = function(endid, nesting_level) {
    var found=false
    var i=0; var slur;
    for(i=0; !found && i<slurs.length;++i) {
      var slr=slurs[i];
      if (slr && !slr.getLastId() && slr.linkCond === nesting_level) {
        found=true;
        slr.setLastId(endid);
      }
    }
    if (!found) {
      var slr = new MEI2VF.EventLink(null, endid);
      slurs.push(slr);      
    }
  }
  
  var parse_slur_attribute = function(slur_str) {
    var result = []
    var numbered_tokens = slur_str.split(' ');
    $.each(numbered_tokens, function(i, numbered_token) {
      var num;
      if (numbered_token.length === 1) {
        result.push({ letter:numbered_token, nesting_level:0 })
      } else if (numbered_token.length===2) {
        if ( !(num=Number(numbered_token[1])) ) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute")
        result.push({ letter:numbered_token[0], nesting_level:num });
      } else {
        throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
      }
    });
    return result;
  }
  
  
  var make_note = function(element, parent_layer, parent_staff_element, parent_measure) {

    //Support for annotations (lyrics, directions, etc.)
    var make_annot_below = function(text) {
      return (new Vex.Flow.Annotation(text)).setFont("Times").setBottom(true);
    };

    var make_annot_above = function(text) {
      return (new Vex.Flow.Annotation(text)).setFont("Times");
    };

    try {
      var note = new Vex.Flow.StaveNote( 
        {
          keys: [mei_note2vex_key(element)],
          clef: staff_clef($(parent_staff_element).attr('n')),
          duration: mei_note2vex_dur(element),
          stem_direction: mei_note_stem_dir(element, parent_staff_element)
        });

      note.addAnnotation(2, make_annot_below(mei_syl2vex_annot(element)));
      var annot = mei_dir2vex_annot(parent_measure, element);
      note.addAnnotation(2, annot[1] == 'below' ? make_annot_below(annot[0]) : make_annot_above(annot[0]));

      try {
        var i;
        for (i=0;i<parseInt($(element).attr('dots'));i++){
          note.addDotToAll();
        }
      } catch (x) {
        throw new Vex.RuntimeError('BadArguments',
        'A problem occurred processing the dots of <note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
      }
      var mei_accid = $(element).attr('accid');
      if (mei_accid) {
        note.addAccidental(0, new Vex.Flow.Accidental(mei_accid2vex_accid(mei_accid)));
      }
      $.each($(element).find('artic'), function(i, ar){
        note.addArticulation(0, new Vex.Flow.Articulation(mei2vexflowTables.articulations[$(ar).attr('artic')]).setPosition(mei2vexflowTables.positions[$(ar).attr('place')]));
      });
      // FIXME For now, we'll remove any child nodes of <note>
      $.each($(element).children(), function(i, child) { $(child).remove(); });

      //Build a note object that keeps the xml:id

      // If xml:id is missing, create it
      var xml_id = $(element).attr('xml:id');
      if (!xml_id) {
        xml_id = MeiLib.createPseudoUUID();
        $(element).attr('xml:id', xml_id);
      }

      var mei_tie = $(element).attr('tie'); 
      if (!mei_tie) mei_tie = "";
      var pname = $(element).attr('pname');
      if (!pname) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
      for (var i=0; i<mei_tie.length; ++i) {
        switch (mei_tie[i]) {
          case 'i': start_tieslur(xml_id, pname, ties); break;
          case 't': terminate_tie(xml_id, pname); break;
        }
      }

      var mei_slur = $(element).attr('slur'); 
      if (mei_slur) {
        //create a list of { letter, num }
        var tokens = parse_slur_attribute(mei_slur);
        $.each(tokens, function(i, token) {
          switch (token.letter) {
            case 'i': start_tieslur(xml_id, token.nesting_level, slurs); break;
            case 't': terminate_slur(xml_id, token.nesting_level); break;
          }
        });
      } 
      
      
      var note_object = {vexNote: note, id: xml_id};
      notes.push(note_object);

      notes_by_id[xml_id] = { meiNote:element, vexNote:note };

      return note_object;

    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_rest = function(element, parent_layer, parent_staff_element, parent_measure) {
    try {
      var rest = new Vex.Flow.StaveNote({keys: ['c/5'], duration: mei_note2vex_dur(element, false) + 'r'});
      if ($(element).attr('dots') === '1') {
        rest.addDotToAll();
      }
      return rest;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <rest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_mrest = function(element, parent_layer, parent_staff_element, parent_measure) {

    try {
      var mrest = new Vex.Flow.StaveNote({keys: ['c/5'], duration: 'wr'});
      return mrest;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <mRest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_beam = function(element, parent_layer, parent_staff_element, parent_measure) {
    var elements = $(element).children().map(function(i, note) 
    { 
      //make sure to get vexNote out of wrapped note objects
      var proc_element = process_element(note, parent_layer, parent_staff_element, parent_measure);
      return proc_element.vexNote ? proc_element.vexNote : proc_element;
    }).get();

    beams.push(new Vex.Flow.Beam(elements));

    return elements;
  };

  var make_chord = function(element, parent_layer, parent_staff_element, parent_measure) {
    try {
      var keys = $(element).children().map(mei_note2vex_key).get();
      var duration = mei_dur2vex_dur(Math.max.apply(Math, $(element).children().map(function() { 
        return Number($(this).attr('dur')); 
      }).get()));
      var dotted = $(element).children().map(function() { 
        return $(this).attr('dots') === '1'; 
      }).get().any();
      if (dotted === true) { duration += 'd'; }

      var chord = new Vex.Flow.StaveNote({keys: keys,
        clef: staff_clef($(parent_staff_element).attr('n')),
        duration: duration
      });
      //stem_direction: stem_direction: mei_note_stem_dir(mei_note, parent_staff)});

      if (dotted === true) { chord.addDotToAll(); }

      $(element).children().each(function(i, note) { 
        var mei_accid = $(note).attr('accid');
        if (mei_accid !== undefined) { 
          chord.addAccidental(i, new Vex.Flow.Accidental(mei_accid2vex_accid(mei_accid))); 
        }
      });

      return chord;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments', 'A problem occurred processing the <chord>:' + x.toString());
      // 'A problem occurred processing the <chord>: ' +
      // JSON.stringify($.each($(element).children(), function(i, element) { 
      //   element.attrs(); 
      // }).get()) + '. \"' + x.toString() + '"');
    }
  };

  var process_element = function(element, parent_layer, parent_staff_element, parent_measure) {
    var element_type = $(element).prop("localName");
    if (element_type === 'rest') {
      return make_rest(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'mrest') {
      return make_mrest(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'note') {
      return make_note(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'beam') {
      return make_beam(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'chord') {
      return make_chord(element, parent_layer, parent_staff_element, parent_measure);
    } else {
      throw new Vex.RuntimeError('BadArguments',
      'Rendering of element "' + element_type + '" is not supported.');
    }
  };

  var make_voice = function(i, voice_contents) {
    if (!$.isArray(voice_contents)) { throw new Vex.RuntimeError('BadArguments', 'make_voice() voice_contents argument must be an array.');  }

    var voice = new Vex.Flow.Voice({num_beats: Number($(score).find('staffDef').attr('meter.count')),
    beat_value: Number($(score).find('staffDef').attr('meter.unit')),
    resolution: Vex.Flow.RESOLUTION});

    voice.setStrict(false);
    voice.addTickables(voice_contents);
    //$.each(voice_contents, function(i, o) { voice.addTickables([o]); });
    return voice;
  };

  initialise_score(target);
  render_measure_wise();
};


