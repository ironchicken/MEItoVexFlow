
MeiLibTest = function(){


  var mei_xml = 'TC.id2tstamp.xml'
  //load the xml file...
  xmlDoc=loadXMLDoc(mei_xml);
  if (xmlDoc) { 
    console.log('MEI-XML loaded.'); 
  } else {
    //TODO: throw exception
  }

  //... and render it onto the canvas
  var score = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  console.log('Start');

  Vex.LogLevel = 5;


  var context = [];
  var meter = { count:4, unit:4};
  $(score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });  

  for (var i=32; i<=32; ++i) {
    var id = 'v1e' + ((i<10)?'0':'') + i.toString();
    console.log(id + ': ' + MeiLib.id2tstamp(id, context));
  }
  

  // $.each(layers, function(i, layer) {
  //   context.push({layer:layer, meter:meter});
  // });
  
  




  console.log('Done');
	
}

