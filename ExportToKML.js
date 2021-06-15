/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
  
geotab.addin.aEMPFormat = function () {
  'use strict';

  // the root container
  var api;
  var elAddin;
  var elExportToKML;
  var eldateInput;
  var vehicleSelect;
  var dateValue;
  var xmlDoc;

  var xmlString;
  var parser = new DOMParser();
  var s = new XMLSerializer();
  var eqpCount,
      elInd,
      elCount,
      selected,
      all;

  var selectAll = document.getElementById('selectAll')
  var allSelected = false
       
  elExportToKML = document.getElementById('exportToKML');
  eldateInput = document.getElementById('datetime');
  selected = [];

  function filter(){ //filter vehicles by search
    var input, filter, a, i, div, txtValue;
    input = document.getElementById('vehicleSearch');
    filter = input.value.toUpperCase();
    div = document.getElementById('vehicleList');
    a = div.getElementsByTagName('li');
    for (i = 0; i < a.length; i++) {
      txtValue = a[i].textContent || a[i].innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        a[i].style.display = '';
      } else {
        a[i].style.display = 'none';
      }
    }
  }

  function createDoc(){ //create and export kml doc
    xmlString = s.serializeToString(xmlDoc) 

    //created kml doc
    var fileName = 'EXP_' + dateValue
    var uri = URL.createObjectURL(new Blob([xmlString], {type : 'text/xml'})); 
    var link = document.createElement('a');
    link.href = uri;

    link.style = 'visibility:hidden';
    link.download = fileName  + '.kml';
  
    //append the anchor tag and remove it after automatic click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    //re-enable Export button
    elExportToKML.disabled = !elExportToKML.disabled
  }

  function xmlNode(doc, name, value, parent, ind){
    return new Promise(function(resolve){
      var newEle 
      var newVal  
      if (value == null){
        resolve()
      } else {
        newEle = doc.createElement(name);
        newVal = doc.createTextNode(value);
        newEle.appendChild(newVal)
        doc.getElementsByTagName(parent)[ind].appendChild(newEle)
        resolve()
      }      
    })
  }

 function startXML(){
    var eqpXML = '<?xml version="1.0" encoding="utf-8"?><kml><Document></Document></kml>'
    xmlDoc = parser.parseFromString(eqpXML, 'text/xml')
    xmlDoc.getElementsByTagName('kml')[0].setAttribute('xmlns', 'http://www.opengis.net/kml/2.2')
    xmlDoc.getElementsByTagName('kml')[0].setAttribute('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    xmlDoc.getElementsByTagName('kml')[0].setAttribute('xmlns:kml', 'http://www.opengis.net/kml/2.2')
//	xmlNode(xmlDoc, 'Document', '', 'kml', 0)
//  elCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    elCount = [0, 0, 0, 0, 0, 0, 0]
    eqpCount = 0
  }

// async function buildXML(vehicleInfo, vinResults, headerInfo){ //add data for device to kml doc
 async function buildXML(headerInfo){ //add data for device to kml doc
  var ind,
      pin,
      installDate,
      installInd,
      vehName,
      make,
      model,
      serialNumber,
   
    vehName =  headerInfo[1][0].name;
    serialNumber = headerInfo[1][0].serialNumber;

//    xmlNode(xmlDoc, 'Document', '', 'kml', 0)
	
	xmlNode(xmlDoc, 'Placemark', '', 'Document', 0)
//    xmlNode(xmlDoc, 'Placemark', '', 'Document', eqpCount)
    xmlNode(xmlDoc, 'name', vehName, 'Placemark', eqpCount)
    xmlNode(xmlDoc, 'Point', '', 'Placemark', eqpCount)
//   xmlNode(xmlDoc, 'coordinates', make, 'Point', eqpCount)
	


    if (headerInfo[1][0].deviceType == 'CustomVehicleDevice'){
      if (headerInfo[2].length != 0){
        var locDateTime = headerInfo[2][0].dateTime;
        var lat = headerInfo[2][0].latitude;
        var long = headerInfo[2][0].longitude; 
		var coord = long + "," + lat + ",0"; 
		
//        xmlNode(xmlDoc, 'Placemark', '', 'Document', eqpCount) 
//        xmlDoc.getElementsByTagName('Location')[elCount[1]].setAttribute('datetime', locDateTime)       
//        xmlNode(xmlDoc, 'Point', '', 'Placemark', eqpCount)
		xmlNode(xmlDoc, 'coordinates', coord, 'Point', elCount[1])
        elCount[1] = elCount[1] + 1
      }
    } else{ //device is a go device
      if (headerInfo[2].length!=0){
        var locDateTime = headerInfo[2][0].dateTime;
        var lat = headerInfo[2][0].latitude;
        var long = headerInfo[2][0].longitude; 
		var coord = long + "," + lat + ",0"; 
		
//        xmlNode(xmlDoc, 'Placemark', '', 'Document', eqpCount) 
//        xmlDoc.getElementsByTagName('Location')[elCount[1]].setAttribute('datetime', locDateTime)       
//        xmlNode(xmlDoc, 'Point', '', 'Placemark', elCount[1])
        xmlNode(xmlDoc, 'coordinates', coord, 'Point', elCount[1])
        elCount[1] = elCount[1] + 1
      } 
    }
    eqpCount = eqpCount + 1 //increase device count
  }

  function mCall(callList){ 
    return new Promise(function (resolve, reject) {
      api.multiCall(callList, function(result){
          resolve(result)
        }, function(e){
          console.log('Error:', e);
          reject(e)
        }
      )
    })
  }

  async function getInfo(vehicleList) {
    startXML() //initialize xml doc
    var calls = [],
        thirdPartyCalls = [],
        goCalls = [],
        goDiags,
        devId,
        deviceType,
        devHeaderInfo;

    var prevWeek = new Date(dateValue)
    prevWeek.setDate(prevWeek.getDate() - 7);
    var prevDay = new Date(dateValue)
    prevDay.setDate(prevDay.getDate()-1);

    // go device diagnostics
    goDiags = ['DiagnosticOdometerAdjustmentId',
      'DiagnosticEngineHoursAdjustmentId',
      'DiagnosticTotalFuelUsedId',
      'DiagnosticDeviceTotalFuelId', //total fuel used since telematives device install
      'DiagnosticTotalIdleHoursId',
      'DiagnosticFuelTankCapacityId',
      'DiagnosticFuelLevelId'];


    for (var j in vehicleList){
      devId = vehicleList[j].id;
      calls.push(['GetReportData', {
        'argument': {
            'devices': [{'id':devId}],
            'includeAllHistory': false,
            'reportArgumentType': 'DeviceInstallHistory'
        }}] ,['Get', {
            typeName: 'Device',  //Device
            search: {
              id: devId
            }
          }],['Get', {
//            typeName: 'LogRecord',  // Location info
            typeName: 'DeviceStatusInfo',  // Location info			
            search: { 
              deviceSearch: {
                id: devId
              },
//              'fromDate': dateValue,
//             'toDate': dateValue
            }
          }]
      )
    }

    var devInfo = await mCall(calls)  

    for (var j in vehicleList){
      devId = vehicleList[j].id
      devHeaderInfo = [devInfo[(j*3)], devInfo[(j*3)+1], devInfo[(j*3)+2]]
      deviceType = devInfo[(j*3)+1][0].deviceType;   

      if(deviceType != 'CustomVehicleDevice'){ // if go device

 //       await buildXML(goResult, vinResult, devHeaderInfo) //add results to XML
		
        await buildXML(devHeaderInfo) //add results to XML		
      }
    }
    createDoc() //create and download xml doc
  }

  function vehicleOnSelect(vehicleSelected) {
    if(selected.includes(vehicleSelected)){
      vehicleSelected.setAttribute('class','active');
      var m = selected.indexOf(vehicleSelected)
      selected.splice(m, 1)
    } else{
      vehicleSelected.setAttribute('class','notActive');
      selected.push(vehicleSelected)
      
    }
  }

  // events

  //select all button
  selectAll.addEventListener('click', event => {
    selected = []
    if (allSelected == false){
      for (var ele in all){
        all[ele].setAttribute('class','notActive');
        selected.push(all[ele])
      }
      allSelected = true
    } else{
      for (var ele in all){
        all[ele].setAttribute('class','active');
      }
      allSelected = false
    }
  
  });

  //Submit Button
  elExportToKML.addEventListener('click', event => {
    event.preventDefault();
    vehicleSelect = selected
    dateValue = document.getElementById('datetime').value; //$('#datetime').val();
    dateValue = new Date(dateValue).toISOString();
    if (vehicleSelect.length > 0){
      getInfo(vehicleSelect) //getVehicleInfo
      elExportToKML.setAttribute('disabled', true)
    }
  })

  //date time input
  document.getElementById('datetime').addEventListener('change', event => {
    event.preventDefault();
  })

  // vehicle search
  document.getElementById('vehicleSearch').onkeyup = function () {
    filter(); //filter results based on search
  }

  document.getElementById('vehicleSearch').onsearch = function () {
    filter(); //filter results based on search
  }


  return {
    /**
     * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
     * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
     * is ready for the user.
     * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
     * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
     * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
     *        might be doing asynchronous operations, you must call this method when the Add-In is ready
     *        for display to the user.
     */
    initialize: function (freshApi, freshState, initializeCallback) {
      elAddin = document.querySelector('#aEMPFormat');
      api = freshApi

          // set up dates

      let now = new Date();
      let dd = now.getDate();
      let mm = now.getMonth() + 1;
      let yy = now.getFullYear();
      let hh = now.getHours();
      let mn = now.getMinutes();

      if (dd < 10) {
        dd = '0' + dd;
      }

      if (mm < 10) {
        mm = '0' + mm;
      }

      if (hh < 10) {
        hh = '0' + hh;
      }

      if (mn < 10) {
        mn = '0' + mn;
      }

      eldateInput.value = yy + '-' + mm + '-' + dd + 'T' + hh + ':' + mn;
      // MUST call initializeCallback when done any setup
    
      initializeCallback();
    },

    /**
     * focus() is called whenever the Add-In receives focus.
     *
     * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
     * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
     * the global state of the MyGeotab application changes, for example, if the user changes the global group
     * filter in the UI.
     *
     * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
     * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
     */
    focus: function (freshApi, freshState) {
      api = freshApi;

      // while (elVehicleSelect.firstChild) {
      //   elVehicleSelect.removeChild(elVehicleSelect.firstChild);
      // }
      document.getElementById('vehicleList').innerHTML = ''
      all = []
      
      api.call('Get', {
        typeName: 'Device',
        resultsLimit: 100,
        search: {
//        fromDate: new Date().toISOString(),
		  fromDate: dateValue,
		  deviceType: 'GO9',
          groups: freshState.getGroupFilter()
        }
      }, vehicles => {
        if (!vehicles || vehicles.length < 0) {
          return;
        }
        
        vehicles.forEach(vehicle => {
          
          var element = document.createElement('li')
          element.id = vehicle.id;
          element.setAttribute('class', 'selectButton')
    
          var nameTextnode = document.createTextNode(vehicle.name);
          var serialTextNode = document.createTextNode(' (' + vehicle.serialNumber + ')');
          var divClass = document.createElement('div');
          divClass.className = 'g-row checkmateListBuilderRow';
          var aClass = document.createElement('a');
          aClass.className = 'g-main g-main-col';
          var divClass2 = document.createElement('div');
          divClass2.className = 'g-name'
          var spanClass = document.createElement('span'); 
          spanClass.className = 'ellipsis';
          spanClass.id = 'span-id'
          var spanClass2 = document.createElement('span');
          spanClass2.className = 'secondaryData email';
          spanClass2.appendChild(serialTextNode);
          spanClass.appendChild(nameTextnode);
          spanClass.appendChild(spanClass2);
          divClass2.appendChild(spanClass);
          
          aClass.appendChild(divClass2);
          divClass.appendChild(aClass);
          element.appendChild(divClass);
          document.getElementById('vehicleList').appendChild(element);
          all.push(element)
          element.onclick = function(){vehicleOnSelect(this)};

        });
      });

      // show main content
      elAddin.className = '';
    },

    /**
     * blur() is called whenever the user navigates away from the Add-In.
     *
     * Use this function to save the page state or commit changes to a data store or release memory.
     *
     * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
     * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
     */
    blur: function () {
      // hide main content
      elAddin.className = 'hidden';
    }
  };
};
