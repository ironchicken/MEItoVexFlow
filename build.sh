#!/bin/bash

temp_js=mei2vf-combined.js
cat meilib.js           > $temp_js
cat tables.js           >> $temp_js
cat meitovexflow.js     >> $temp_js
cat EventLink.js        >> $temp_js
cat EventReference.js   >> $temp_js
cat StaffInfo.js        >> $temp_js
cat StaveConnector.js   >> $temp_js
cat StaveVoices.js      >> $temp_js

java -jar support/yuicompressor-2.4.7.jar $temp_js -o build/meitovexflow-min.js --disable-optimizations

rm $temp_js

