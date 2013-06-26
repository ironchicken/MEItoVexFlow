
MEI2VF.RunTest = function(test_case, canvas, titleElem){

  $(titleElem).html(test_case.title);

  //load the xml file...
  console.log("Running Test Case Title: '" + test_case.title + "' MEI-XML: '" + test_case.mei_xml + "'");
  xmlDoc=loadXMLDoc(test_case.mei_xml);
  console.log('MEI-XML loaded.');

  //... and render it onto the canvas
  var MEI = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  console.log('Rendering... ');
  MEI2VF.render_notation(MEI, canvas, 981,400);
  console.log('Done (' + test_case.title + ')');
	
}

