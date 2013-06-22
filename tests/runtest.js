

MEI2VF.RunTest = function(test_case, canvas, titleElem){

  //load the appropriate file
  xmlDoc=loadXMLDoc(test_case.mei_xml);
  
  //render it onto the appropriate canvas
	var MEI = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
	MEI2VF.render_notation(MEI, canvas, 981,400);
	$(titleElem).html(test_case.title);
	
}