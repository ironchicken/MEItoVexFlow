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

var render_notation = function(score, target, width, height) {
    width = width || 800;
    height = height || 350;

    var renderer, canvas, context;
    var staves = [];
    var measures = [];
    var beams = [];
    var notes = [];
    var rendering_method;

    var mei_note2vex_key = function(mei_note) {
	mei_note = (typeof mei_note === 'number' && arguments.length === 2 && typeof arguments[1] === 'object') ? arguments[1] : mei_note;

	return $(mei_note).attr('pname') + '/' + $(mei_note).attr('oct');
    };

     //Add annotation (lyrics)
    var mei_syl2vex_annot = function(mei_note) {
        var syl = $(mei_note).find('mei\\:syl'); 
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
        var dir = $(parent_measure).find('mei\\:dir')
        var dir_text = '';
        var pos = '';
        $(dir).each(function(){
            if ($(this).attr('startid') == $(mei_note).attr('xml:id')){
                dir_text += $(this).text().trim();
                pos = $(this).attr('place');
            }
        });
        return [dir_text, pos];
    }

    var vex_key_cmp = function(key1, key2) {
	key1 = {pitch: key1.split('/')[0][0], octave: Number(key1.split('/')[1])};
	key2 = {pitch: key2.split('/')[0][0], octave: Number(key2.split('/')[1])};

	if (key1.octave === key2.octave) {
	    if (key1.pitch === key2.pitch) { return 0; }
	    else if (key1.pitch < key2.pitch) { return -1; }
	    else if (key1.pitch > key2.pitch) { return 1; }
	} else if (key1.octave < key2.octave) { return -1; }
	else if (key1.octave > key2.octave) { return 1; }
    };

    var vex_dur_cmp = function(key1, key2) {

    };

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

	mei_note = (typeof mei_note === 'number' && arguments.length === 2 && typeof arguments[1] === 'object') ? arguments[1] : mei_note;

	if ($(mei_note).attr('dur') === undefined) {
	    alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
	}

	var dur = mei_dur2vex_dur($(mei_note).attr('dur'));
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
	return undefined;
    };

    var mei_note2vex_accid = function(mei_note) {
	var accid = $(mei_note).attr('accid');
	if (accid !== undefined) {
	    return mei_accid2vex_accid($(mei_note).attr('accid'));
	}
    };

    var mei_note_stem_dir = function(mei_note, parent_staff_element) {
	var given_dir = $(mei_note).attr('stem.dir');
	if (given_dir !== undefined) {
	    return (given_dir === 'up') ? Vex.Flow.StaveNote.STEM_UP : (given_dir === 'down') ? Vex.Flow.StaveNote.STEM_DOWN : undefined;
	} else {
	    var clef = staff_clef($(parent_staff_element).attr('n'));
	    if (clef === 'treble') {
		return (vex_key_cmp('a/5', mei_note2vex_key(mei_note)) == 1) ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;
	    } else if (clef === 'bass') {
		return (vex_key_cmp('c/4', mei_note2vex_key(mei_note)) == -1) ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;
	    }
	}
    };

    var mei_staffdef2vex_keyspec = function(mei_staffdef) {
	if ($(mei_staffdef).attr('key.pname') !== undefined && $(mei_staffdef).attr('key.mode') !== undefined) {
	    var keyname = $(mei_staffdef).attr('key.pname').toUpperCase();
	    if ($(mei_staffdef).attr('key.accid') !== undefined) {
		if ($(mei_staffdef).attr('key.accid') === 's') { keyname += '#'; }
		else if ($(mei_staffdef).attr('key.accid') === 'f') { keyname += 'b'; }
	    }
	    keyname += $(mei_staffdef).attr('key.mode') === 'major' ? '' : 'm';

	    return keyname;
	}
    };

    var mei_staffdef2vex_clef = function(mei_staffdef) {
	if ($(mei_staffdef).attr('clef.shape') === 'G') {
	    return 'treble';
	} else if ($(mei_staffdef).attr('clef.shape') === 'F') {
	    return 'bass';
	}
    };

    var staff_clef = function(staff_n) {
	var staffdef = $(score).find('mei\\:staffdef[n=' + staff_n + ']')[0];
	return mei_staffdef2vex_clef(staffdef);
    };

    var mei_staffdef2vex_timespec = function(mei_staffdef) {
	if ($(mei_staffdef).attr('meter.count') !== undefined && $(mei_staffdef).attr('meter.unit') !== undefined) {
	    return $(mei_staffdef).attr('meter.count') + '/' + $(mei_staffdef).attr('meter.unit');
	}
    };

    var initialise_score = function(canvas) {
	renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
	context = renderer.getContext();
    };

    var initialise_staff = function(i, staffdef, with_clef, with_keysig, with_timesig, left, top, width) {
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

    var render_staff_wise = function() {
	rendering_method = 'staff-wise';

	$(score).find('mei\\:staffdef').each(function(i, staffdef) { staves[(Number($(staffdef).attr('n')))] = initialise_staff(i, staffdef, true, true, true, 0, i * 100, width); });

	var i;
	for (staff_n in staves) {
	    var layers = $(score).find('mei\\:staff[n=' + staff_n + ']').map(extract_layers).get();

	    var voices = {};

	    for (i = 0; i < layers.length; i++) {
		var voice_n = layers[i].layer;
		if (voices.hasOwnProperty(voice_n)) {
		    voices[voice_n].push.apply(voices[voice_n], layers[i].events)
		} else {
		    voices[voice_n] = layers[i].events;
		}
	    }

	    var voices_a = [];
	    for (voice_n in voices) {
		voices_a.push(make_voice(null, voices[voice_n]));
	    }
	    var formatter = new Vex.Flow.Formatter().joinVoices(voices_a).format(voices_a, width);
	    $.each(voices_a, function(i, voice) { voice.draw(context, staves[staff_n]); });
	    $.each(beams, function(i, beam) { beam.setContext(context).draw(); });
	}
    };

    var render_measure_wise = function() {
	rendering_method = 'measure-wise';

	$(score).find('mei\\:measure').each(extract_staves);
	$.each(beams, function(i, beam) { beam.setContext(context).draw(); });
    	//do ties now!
	$(score).find('mei\\:tie').each(make_ties);
	$(score).find('mei\\:slur').each(make_ties);
    $(score).find('mei\\:hairpin').each(make_hairpins);
    };

    var make_ties = function(i, tie){
        //find first and last note
        var f_note = null;
        var l_note = null;
        $(notes).each(function(i, note) {
            if (note.id === $(tie).attr('startid')) { f_note = note.vexNote; }
            else if (note.id === $(tie).attr('endid')) { l_note = note.vexNote; }
        });
        new Vex.Flow.StaveTie({
            first_note: f_note,
            last_note: l_note,
            first_indices: [0],
            last_indices: [0]
        }).setContext(context).draw();
    }

    var make_hairpins = function(i, hp){
        //find first and last note
        var f_note = null;
        var l_note = null;
        $(notes).each(function(i, note) {
            if (note.id === $(hp).attr('startid')){ f_note = note.vexNote; }
            if (note.id === $(hp).attr('endid')){ l_note = note.vexNote; }
        });
        var place = mei2vexflowTables.positions[$(hp).attr('place')];
        var type = mei2vexflowTables.hairpins[$(hp).attr('form')];        
        var l_ho = 0;
        var r_ho = 0;
        var hairpin_options = {height: 10, y_shift:0, left_shift_px:l_ho, r_shift_px:r_ho};
                
        new Vex.Flow.StaveHairpin({
            first_note: f_note,
            last_note: l_note,
        }, type).setContext(context).setRenderOptions(hairpin_options).setPosition(place).draw();
        
    }

    var extract_staves = function(i, measure) {
	if (rendering_method === 'staff-wise') {
	    return $(measure).find('mei\\:staff').map(function(i, staff) { return extract_layers(i, staff, measure); }).get();
	} else if (rendering_method === 'measure-wise') {
	    measures.push($(measure).find('mei\\:staff').map(function(i, staff) { return extract_layers(i, staff, measure); }).get());
	};
    };

    var extract_layers = function(i, staff_element, parent_measure) {
	if (rendering_method === 'staff-wise') {
	    return $(staff_element).find('mei\\:layer').map(function(i, layer) { return extract_events(i, layer, staff_element, parent_measure); }).get();
	} else if (rendering_method === 'measure-wise') {
	    var n_measures = $(score).find('mei\\:measure').get().length;
	    var measure_width = Math.round(width / n_measures);
	    var staff, left, top;
	    if ($(staff_element).parent().get(0).attrs().n === '1') {
		left = 0
		top = (Number(staff_element.attrs().n) - 1) * 100;
        /* Determine if there's a new staff definition, or take default */
		/* TODO: deal with non-general changes. NB if there is no @n in staffdef it applies to all staves */
        if ($(parent_measure).prev().get(0) != undefined && $(parent_measure).prev().get(0).tagName.toLowerCase() === 'mei:scoredef' && !$(parent_measure).prev().get(0).attrs().n) {
            scoredef = $(parent_measure).prev().get(0);
            staff = initialise_staff(null, scoredef, false, false, $(scoredef).attr('meter.count') ? true : false, left, top, measure_width + 30);
        }
        else {
	      staff = initialise_staff(null, $(score).find('mei\\:staffDef[n=' + staff_element.attrs().n + ']')[0], true, true, true, left, top, measure_width + 30);
	    } 
	    } else {
		var previous_measure = measures[measures.length-1][0];
		left = previous_measure.x + previous_measure.width;
		top = (Number(staff_element.attrs().n) - 1) * 100;
		/* Determine if there's a new staff definition, or take default */
		/* TODO: deal with non-general changes. NB if there is no @n in staffdef it applies to all staves */
        if ($(parent_measure).prev().get(0).tagName == 'MEI:SCOREDEF' && !$(parent_measure).prev().get(0).attrs().n) {
            scoredef = $(parent_measure).prev().get(0);
            staff = initialise_staff(null, scoredef, false, false, $(scoredef).attr('meter.count') ? true : false, left, top, measure_width + 30);
        }
        else {
		    staff = initialise_staff(null, $(score).find('mei\\:staffDef[n=' + staff_element.attrs().n + ']')[0], false, false, false, left, top, measure_width);
	    }
	    }

	    var layer_events = $(staff_element).find('mei\\:layer').map(function(i, layer) { return extract_events(i, layer, staff_element, parent_measure); }).get();
        
        // rebuild object by extracting vexNotes before rendering the voice TODO: put in independent function??
        var vex_layer_events = [];
        $(layer_events).each(function(){ vex_layer_events.push( {events : $(this.events).get().map( function(events){ return events.vexNote ? events.vexNote : events; }), layer: this.layer} )});
        
	    var voices = $.map(vex_layer_events, function(events) { return make_voice(null, events.events); });
	    var formatter = new Vex.Flow.Formatter().joinVoices(voices).format(voices, measure_width).formatToStave(voices, staff);
	    $.each(voices, function(i, voice) { voice.draw(context, staff);});

	    return staff;
	};
    };

    var extract_events = function(i, layer, parent_staff_element, parent_measure) {
	// the calling context for this function is always a
	// map(extract_events).get() which will flatten the arrays
	// returned. Therefore, we wrap them up in an object to
	// protect them.
	return {layer: i, events: $(layer).children().map(function(i, element) { return process_element(i, element, layer, parent_staff_element, parent_measure); }).get()};
    };

    var make_note = function(element, parent_layer, parent_staff_element, parent_measure) {
    
	//Support for annotations (lyrics, directions, etc.)
	var make_annot_below = function(text) {
	    return (new Vex.Flow.Annotation(text)).setFont("Times").setBottom(true);
	};

	var make_annot_above = function(text) {
	    return (new Vex.Flow.Annotation(text)).setFont("Times");
	};
    
	try {
	    var note = new Vex.Flow.StaveNote({keys: [mei_note2vex_key(element)],
					       clef: staff_clef($(parent_staff_element).attr('n')),
					       duration: mei_note2vex_dur(element),
					       stem_direction: mei_note_stem_dir(element, parent_staff_element)});

	    note.addAnnotation(2, make_annot_below(mei_syl2vex_annot(element)));
	    var annot = mei_dir2vex_annot(parent_measure, element);
	    note.addAnnotation(2, annot[1] == 'below' ? make_annot_below(annot[0]) : make_annot_above(annot[0]));

	    try {
	       for (i=0;i<parseInt($(element).attr('dots'));i++){
	           note.addDotToAll();
	       }
	    } catch (x){
	       throw new Vex.RuntimeError('BadArguments',
				       'A problem occurred processing the dots of <mei:note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.message + '"');
	    }
	    if ($(element).attr('accid')) {
		note.addAccidental(0, new Vex.Flow.Accidental(mei_note2vex_accid(element)));
	    }
        $.each($(element).find('mei\\:artic'), function(i, ar){
	       note.addArticulation(0, new Vex.Flow.Articulation(mei2vexflowTables.articulations[$(ar).attr('artic')]).setPosition(mei2vexflowTables.positions[$(ar).attr('place')]));
	    });
	    // FIXME For now, we'll remove any child nodes of <mei:note>
	    $.each($(element).children(), function(i, child) { $(child).remove(); });

	    //Build a note object that keeps the xml:id

            // Sanity check
            if (!$(element).attr('xml:id')) throw new Vex.RuntimeError("BadArguments", "mei:note must have a xml:id attribute.");

            var note_object = {vexNote: note, id: $(element).attr('xml:id')};
            notes.push(note_object);

	    return note_object;

	} catch (x) {
	    throw new Vex.RuntimeError('BadArguments',
				       'A problem occurred processing the <mei:note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.message + '"');
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
				       'A problem occurred processing the <mei:rest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.message + '"');
	}
    };

    var make_mrest = function(element, parent_layer, parent_staff_element, parent_measure) {
    
	try {
	    var mrest = new Vex.Flow.StaveNote({keys: ['c/5'], duration: 'wr'});
	    return mrest;
	} catch (x) {
	    throw new Vex.RuntimeError('BadArguments',
				       'A problem occurred processing the <mei:mRest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.message + '"');
	}
    };


    var make_beam = function(element, parent_layer, parent_staff_element, parent_measure) {
	var elements = $(element).children().map(function(i, note) { 
	   //make sure to get vexNote out of wrapped note objects
	   var proc_element = process_element(i, note, parent_layer, parent_staff_element, parent_measure);
	   return proc_element.vexNote ? proc_element.vexNote : proc_element;
	}).get();
	
	beams.push(new Vex.Flow.Beam(elements));
	
	return elements;
    };

    var make_chord = function(element, parent_layer, parent_staff_element, parent_measure) {
	try {
	    var keys = $(element).children().map(mei_note2vex_key).get();
	    var duration = mei_dur2vex_dur(Math.max.apply(Math, $(element).children().map(function() { return Number($(this).attr('dur')); }).get()));
	    var dotted = $(element).children().map(function() { return $(this).attr('dots') === '1'; }).get().any();
	    if (dotted === true) { duration += 'd'; }

	    var chord = new Vex.Flow.StaveNote({keys: keys,
						clef: staff_clef($(parent_staff_element).attr('n')),
						duration: duration});
					       //stem_direction: stem_direction: mei_note_stem_dir(mei_note, parent_staff)});

	    if (dotted === true) { chord.addDotToAll(); }

	    $(element).children().each(function(i, note) { if ($(note).attr('accid') !== undefined) { chord.addAccidental(i, new Vex.Flow.Accidental(mei_note2vex_accid(note))); }});

	    return chord;
	} catch (x) {
	    throw new Vex.RuntimeError('BadArguments',
				       'A problem occurred processing the <mei:chord>: ' +
				       JSON.stringify($.each($(element).children(), function(i, element) { element.attrs(); }).get()) + '. \"' + x.message + '"');
	}
    };

    var process_element = function(i, element, parent_layer, parent_staff_element, parent_measure) {
	var element_type = $(element).get(0).tagName.toLowerCase();
	if (element_type === 'mei:rest') {
	    return make_rest(element, parent_layer, parent_staff_element, parent_measure);
	} else if (element_type === 'mei:mrest') {
	    return make_mrest(element, parent_layer, parent_staff_element, parent_measure);
	} else if (element_type === 'mei:note') {
	    return make_note(element, parent_layer, parent_staff_element, parent_measure);
	} else if (element_type === 'mei:beam') {
	    return make_beam(element, parent_layer, parent_staff_element, parent_measure);
	} else if (element_type === 'mei:chord') {
	    return make_chord(element, parent_layer, parent_staff_element, parent_measure);
	} else {
	    throw new Vex.RuntimeError('BadArguments',
				       'Rendering of element "' + element_type + '" is not supported.');
	}
    };

    var make_voice = function(i, voice_contents) {
	if (!$.isArray(voice_contents)) { throw new Vex.RuntimeError('BadArguments', 'make_voice() voice_contents argument must be an array.');  }

	var voice = new Vex.Flow.Voice({num_beats: Number($(score).find('mei\\:staffDef').attr('meter.count')),
					beat_value: Number($(score).find('mei\\:staffDef').attr('meter.unit')),
					resolution: Vex.Flow.RESOLUTION});

	voice.setStrict(false);
	voice.addTickables(voice_contents);
	//$.each(voice_contents, function(i, o) { voice.addTickables([o]); });
	return voice;
    };

    initialise_score(target);
    render_measure_wise();
};
