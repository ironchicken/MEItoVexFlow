
MeiLibTest = function(){


  var mei_xml = 'TC.tstamp2id.xml'
  //load the xml file...
  xmlDoc=loadXMLDoc(mei_xml);
  console.log('MEI-XML loaded.'); 

  var score = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  console.log('Start');

  Vex.LogLevel = 5;

  console.log('******************************************************************');
  console.log('********* TEST: id2tstamp() **************************************');
  var id2ts_xmlDoc = loadXMLDoc('TC.id2tstamp.xml');
  console.log('MEI-XML loaded.'); 
  var id2ts_score = id2ts_xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');

  var context = [];
  var meter = { count:4, unit:4};
  $(id2ts_score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });  
  
  for (var i=1; i<=41; ++i) {
    var id = 'v1e' + ((i<10)?'0':'') + i.toString();
    console.log(id + ': ' + MeiLib.id2tstamp(id, context));
  }
  

  console.log('******************************************************************');
  console.log('********* TEST: EventEnumerator and durationOf() ****************');
  context = [];
  $(score).find('layer').each(function(i, layer) {
    console.log('<<<<measure ' + (i+1).toString());
    context.push({layer:layer, meter:meter});
    var layerEnum = new MeiLib.EventEnumerator(layer);
    var evnt;
    while (!layerEnum.EoI) {
      evnt = layerEnum.nextEvent();
      var id = $(evnt).attr('xml:id'); 
      var idstr = '['+id+']';
      console.log(idstr + MeiLib.durationOf(evnt, meter));
    }
  });
  
  console.log('******************************************************************');
  console.log('********* TEST: tstamp2id() **************************************');
  context = [];
  $(score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });

  
  var TCs = {
    tstamp2id:[ { name:'TEST: simple', measure:1 }, 
                { name:'TEST: with beams', measure:2 }, 
                { name:'TEST: mRest', measure:3 },
                { name:'TEST: beams and chord', measure:4 },
                { name:'TEST: chords', measure:5 },
                { name:'TEST: dots', measure:6 } ]
  }

  for (var k=0; k<TCs.tstamp2id.length; ++k) {
    console.log('=================== ' + TCs.tstamp2id[k].name + mei_xml + ':meausre #' + TCs.tstamp2id[k].measure.toString());
    var index=TCs.tstamp2id[k].measure-1;
    var tstamps = ['1', '1.1', '1.25', '1.5', '1.75', '2', '2.1', '2.25', '2.5', '2.9', '3', '3.1', '3.5', '3.9', '4', '4.25', '4.5', '4.75', '5' ];
    for (var i=0; i<tstamps.length; ++i) {
      console.log('tstamp=' + tstamps[i] + '--> xmlid=' + MeiLib.tstamp2id(tstamps[i], context[index].layer, meter));    
    }
  }
  
  console.log('******************************************************************');
  console.log('********* TEST: parseSourceList() **************************************');

  var variant_mei = loadXMLDoc('TC.Variants.xml');
  console.log('MEI-XML loaded.'); 
  var head = variant_mei.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'meiHead');
  
  var sources = MeiLib.parseSourceList(head);
  console.log('JS obejct:');
  console.log(sources);
  var sourcesJSON = MeiLib.JSON.parseSourceList(head);
  console.log('JSON:');
  console.log(sourcesJSON);
  
  




  console.log('Done');
	
}

