
MeiLibTest = function(){

  var print_xml = function(xml) {
    var serializer = new XMLSerializer();
    var strXML = serializer.serializeToString($(xml).get(0));
    var strMEI_rplc1 = strXML.replace(/</g, '&lt;');
    var strMEI_rplc2 = strMEI_rplc1.replace(/>/g, '&gt;');
    var code = '<pre><code>'+ strMEI_rplc2 +'</code></pre>';
    document.write(code);
  }

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
  console.log('********* TEST: MeiLib.VariantMei ********************************');
  var xmlDoc_variant_mei = loadXMLDoc('TC.Variants.xml');

  var variantMEI = new MeiLib.VariantMei(xmlDoc_variant_mei);
  print_xml(variantMEI.score);
  console.log(variantMEI.sourceList);
  console.log(variantMEI.APPs);
  
  
  console.log('******************************************************************');
  console.log('********* TEST: MeiLib.SingleVariantPathScore() *******************');

  var appReplacements = {};
  // appReplacements['app01.l1s1m2'] = new MeiLib.AppReplacement('rdg', 'A_abcd');
  // appReplacements['app02.l1s1m3'] = new MeiLib.AppReplacement('rdg', 'A');
  // var single_path_score = new MeiLib.SingleVariantPathScore(xmlDoc_variant_mei,appReplacements);
  var single_path_score = new MeiLib.SingleVariantPathScore(variantMEI);

  print_xml(single_path_score.score);
  console.log(JSON.stringify(single_path_score.variantPath));

  console.log('********* updateVariantPath() *******************');

  var variantPathUpdate = {};
  variantPathUpdate['app01.l1s1m2'] = 'B_xyz';
  single_path_score.updateVariantPath(variantPathUpdate);
  
  print_xml(single_path_score.score);
  console.log(JSON.stringify(single_path_score.variantPath));

  console.log('********* getSlice() *******************');

  var sliceXML = single_path_score.getSlice({start_n:2, end_n:3, noClef:true, noKey:true, noMeter:true, Staves:[1,2]} );
  print_xml(sliceXML);


  console.log('******************************************************************');
  console.log('********* TEST: MeiLib.SliceMEI() ********************************');

  var xmlDoc_slice = loadXMLDoc('TC.Slice.xml');
  var score2slice = xmlDoc_slice.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score')[0];
  var slice  = MeiLib.SliceMEI(score2slice, {start_n:1, end_n:8, noClef:true, noKey:true, noMeter:true, staves:[3]});
  print_xml(slice);


  console.log('Done');
  

	
}