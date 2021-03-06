// ==UserScript==
// @name          moreStudentDetails.user.js
// @namespace	    http://damosworld.wordpress.com
// @description	  Re-render Moodle pages to show student usage
// @version       0.5.4
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_getResourceText
// @grant         GM_info
// @grant         GM_addStyle
// @grant         GM_xmlhttpRequest
// @require       /htmllib/themelib/jquery-1.11.0.js
// @require       /htmllib/themelib/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.min.js
// @require       GM_XHR.js
// @require       balmi.user.js
// @require       GM_balmi_config.js
// @require       GM_mav_config.js
// @resource      jQueryCSS /htmllib/themelib/jquery-ui-1.10.4.custom/css/ui-lightness/jquery-ui-1.10.4.custom.min.css
// @resource      settingsDialogDiv settingsDialogDiv.html
// @resource      busyAnimationDiv busyAnimation.html
// @resource      mavCSS MAVStyles.css
// @include       http://usqstudydesk.usq.edu.au/m2/*
// ==/UserScript==

// @include       http://localhost/fred/*

//don't run on frames or iframes
if (window.top != window.self)  
	exit ;

//Add activityViewer javascript to page and let it do its thing
/**
 * Update the Moodle Page if is_on is set or in urlmode
 * 
 */
function mavUpdatePage()
{
	if(debug) console.log('fragment='+window.location.hash) ;
	if(debug) console.log('isurlmode = '+MAVcourseSettings.isUrlMode()) ;
	if(debug) console.log('fragment='+window.location.hash) ;
	
	//If activityViewer "is_on", then load the activityViewer from server and
	//re-render page
	generateJSONRequest() ;
		
}

function urlModeUpdateMoodleLinks()
{
	//If in url mode, then need to rewrite all moodle links to add the url fragment
	//so that clicking around the moodle site will return the url mode settings
	if (MAVcourseSettings.isUrlMode())
	{
		if (debug) console.log('inside isurlmode in mavupdatepage!!!') ;
		
		var moodleLinks = balmi.getMoodleLinks() ;
		if(debug) console.log('after getmoodlelinks inside mavupdatepage') ;
		allLinks = document.getElementsByTagName("a") ;
		
		for (var i=0; i < allLinks.length; i++)
		{
			//var linkName = allLinks[i].href.replace(/^(?:https?:\/\/)?moodle\.cqu\.edu\.au\//,'\/') ;
			var linkName = allLinks[i].href.replace(/^(?:http?:\/\/)?localhost\/fred\//,'\/') ;
			
			//If this is a moodle link, then rewrite it to add the url fragment
			//but only if the link doesn't already have a fragment (hash)
			if (moodleLinks.hasOwnProperty(linkName) && allLinks[i].href.indexOf('#') == -1)
				allLinks[i].href += window.location.hash ;
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//Add link to SSI system for this course
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function mavAddSSILink(balmi)
{
	var ssiLink = document.createElement('a') ;
	var courseCode = balmi.getCourseCode() ;
	ssiLink.setAttribute('href','https://olt.cqu.edu.au/ssi/ssiMain.php?coursecode='+courseCode) ;
	ssiLink.setAttribute('target','_blank') ;
	courseCodeTextNode = document.createTextNode('Student Indicators') ;
	ssiLink.appendChild(courseCodeTextNode) ;
	balmi.addToBlock('block_cqu_course_support',ssiLink) ;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//Add Mav menu options to the Settings Block in moodle page
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function mavAddActivityViewerSwitch(balmi)
{
	//Add the link option to turn on activityViewer

	//The menu structure for MAV
	var menuConfig = {
		settings_menu:
		[
			{
				text: 'Activity Viewer',
				listeners: { click: null, mouseover: null },
				submenu:
				[
					{
						id: 'mav_activityViewerElement', //id property for the url a tag
						text: //Toggle option
						{
							on:  'Turn Activity View Off',
							off: 'Turn Activity View On'
						},
						toggle: isMavOn(), //Internal state of toggle - 'on' text will be displayed
						//url: '#',
						image: 'http://moodle.cqu.edu.au/theme/image.php?theme=standard&image=i%2Fnavigationitem&rev=391', //Default moodle node image
						title: 'Toggle Activity Viewer',
						listeners: { click: mavSwitchActivityViewer }
					},
					{
						text: 'Activity Viewer Settings',
						title: 'Activity Viewer Settings',
						image: 'http://moodle.cqu.edu.au/theme/image.php?theme=standard&image=i%2Fnavigationitem&rev=391', //Default moodle node image
						listeners: { click: mavDisplaySettings }
					}
				]
			}
		]
	} ;
	
	//if in urlMode change the menu options
	if (MAVcourseSettings.isUrlMode())
	{
		//don't show the Activity Viewer Settings option for now
		menuConfig.settings_menu[0].submenu.splice(1,1) ;

		if(debug) console.log('in urlMode menuConfig='+JSON.stringify(menuConfig)) ;
	}

	balmi.insertMenu(menuConfig) ;
}

/**
 * Function returns true if MAV is switched on, otherwise false
 * 
 * @returns {boolean} True if MAV is on, otherwise false
 */
function isMavOn()
{
	var mav_on = GM_getValue('is_on') ;
	
	var urlMode = MAVcourseSettings.isUrlMode() ;
	
	//If either urlMode or mav_on then return true (mav is actually on)
	return (mav_on || urlMode) ;
}

/**
 * This function will set the link text for turning on or off the activity viewer, based
 * on the GM_getvalue setting is_on
 * 
 */
function mavSetMenuElementText()
{
	//Set text according to whether its already on or off (including img tag)
	var switchLinkText = (isMavOn()) ? 'Turn Activity View Off' : 'Turn Activity View On' ;
	document.getElementById('mav_activityViewerElement').innerHTML =
	'<img src="http://localhost/fred/theme/image.php?theme=stanard&amp;image=i%2Fnavigationitem&amp;rev=391" title="moodle" class="smallicon navicon" alt="moodle">' + switchLinkText ;
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//Mav Settings Dialog
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Event handler to open new window and display optional settings for mav
 * 
 */
function mavDisplaySettings()
{
	
	//init the accordion
	initAccordion();

	//Update widgets on settings window to match the current GM_getvalue settings
	MAVcourseSettings.updateDialog() ;
	
	//Display dialog
	//$(settingsDialogDiv).dialog() ;
	$("#MAVsettingsDiv").dialog
	(
		{
			width: 720,
			height: 500,
			modal: true,
			//position: { my: "center top", at: "center top", of: $("body") },
			buttons:
			{
				"Cancel": function() { $(this).dialog("close") ; },
				"OK"    : function()
				{
					//Update GM_setvalue settings
					try
					{
						MAVcourseSettings.saveJSON() ;
					}
					catch(err)
					{
						alert(err) ;
						return ;
					}
					
					$(this).dialog("close") ;
					
					//IF MAV is already turned on, reload page to reflect settings changes
					if(isMavOn())
						window.location.reload() ;
				}
			}
		}
	) ;
	//mavUpdateSettingsWindow(settingsWindow) ;
	
}

/**
 * Toggle mav on or off
 * 
 */
function mavSwitchActivityViewer()
{
	//If we are in urlMode, then just reload page without url fragment
	if (MAVcourseSettings.isUrlMode())
	{
		GM_setValue('is_on',false) ; //Explicitly turn it off
		mavTurnOffUrlMode() ;
		return ;
	}
	
	GM_setValue('is_on',!GM_getValue('is_on')) ;
	
	if (GM_getValue('is_on'))
	{
		//Toggle the text on the menu
		mavSetMenuElementText() ;
		//Fire updatePage function
		mavUpdatePage() ;
	}
	else
	{
		//Reload the page
		window.location.reload() ;
	}
}

/**
 * Switch off urlMode by reloading page without url fragment options
 * 
 */
function mavTurnOffUrlMode()
{
	//Set the window.location url without the hash (fragment) to reload page
	//http://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-window-location-with-javascript-without-page-refresh
	var l = window.location.href.substr(0, window.location.href.indexOf('#')) ;
	if(debug) console.log('location='+l) ;
	window.location = l ;
	return ;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//Accordion init and config for the dialog
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function initAccordion() 
{
	
	$("#MAVsettingsForm").accordion({
		collapsible: true,
		header: "h2",
		active: false,
		heightStyle: "content"
	});
	
	//init the select weeks jquery buttons
	$("input:button").button();
	$("#MAVdisplayModes, #MAVTypes").buttonset();
	
	$("#timeframe_selectall").bind("click", function(e) {			
		//tick all weeks
		$(".MAVTimeframe").attr('checked',true).prop('checked',true);
	});
	$("#timeframe_selectnone").bind("click", function(e) {			
		//untick all weeks
		$(".MAVTimeframe").prop("checked",false).removeAttr("checked");
	});
	
	
}


//matchine binding for below
/*			var validated = collectSelections();	
			if (validated) {
				do something
				send array to db or something
			}
			else {
				do something else
				example: show error saying "you must select a student first"	
			}
}
*/

//collecting which students are ticked
function collectSelections() {
	
	//clear the array first	
	clearArrays();		
	
	//collect the students involved
/*	var counter = 0;
	var validate = false;		
	$(".recipients").each(function(i) {
		if ( $(this).prop("checked")==true ) {
			studentMIDs[counter] = $(this).val();		
			counter++;	
			validate = true;	
		}
	});	
*/	
	
	return validate;		
}

/**
 * Class for interacting with settings dialog
 * 
 * @param   {Integer} function Integer representing id number of course
 */
function MAVsettings(courseid)
{
	//Instance course id (from breadcrumbs)
	this.courseid = courseid ;
	//Default settings for dialog
	this.defaultJSON =
	{
		activityType: "C", //Default to clicks
		displayMode: "C", //Default to colour
		groups: [ 0 ], //Default to all students
		student: 0 //Default to no specific student
	} ;
	//Have our settings come from the a url fragment
	this.urlMode = false ;

	//Instance settings for dialog - if no settings provided through url, will
	//be set to null initially
	this.JSON = this.urlSettings() ;

}

MAVsettings.prototype.urlSettings = function()
{
	//Get the fragment from the url (but omit initial # character)
	var fragment = window.location.hash.substr(1) ;

	if (debug) console.log('fragment='+fragment) ;

	//If there is no fragment
	if (fragment == '')
		return null ;

	//Temporary variable to hold the settings
	var settings = clone(this.defaultJSON) ;

	//Temporary variable to hold the urlmode
	var mode = this.urlMode ;
	
	var parameters = fragment.split('_') ;

	parameters.forEach
	(
		function(element,index,array)
		{
			var s = element.split(':') ;
			var parameter = s.shift() ;

			//Only use parameter names that MAV already knows about
			if (settings.hasOwnProperty(parameter))
			{
				//If this parameter requires an array, then store from fragment an array
				if (settings[parameter] instanceof Array)
					settings[parameter] = s ;
				else //Otherwise, store just the first value that it happens to find
					settings[parameter] = s[0] ;
			}
			//Else if parameter is 'mav' and is set true, then we now know we are
			//definitely in mav urlmode, and its not a moodle fragment
			else if (parameter == 'mav' && s[0] == true)
				mode = true ; //Set urlmode in settings instance
		}
	) ;
	
	//Save the mode into the instance variable
	this.urlMode = mode ;
	
	//If there isn't a mav parameter set to true value (ie 1) in the fragment
	//then the fragment wasn't meant for mav, and so ignore the fragment and
	//just return null
	if (!this.urlMode)
		settings = null ;

	if (debug) console.log('mav url settings='+JSON.stringify(settings)) ;

	return settings ;	
}

/**
 * Method will return true if a url fragment has provided settings for MAV
 * 
 * @returns {boolean} True if settings provided through url otherwise false
 */
MAVsettings.prototype.isUrlMode = function()
{
	return this.urlMode ;
}

/**
 * Method for loading the activity type from GM and updating the dialog
 */
MAVsettings.prototype.loadActivityType = function()
{
	//Make sure JSON has been loaded from GM
	this.loadJSON() ;
	
	//Get the relevant info from the json for the display mode
	var type = this.JSON.activityType ;
	
	//Preset dialog with the stored settings
	//Unset all input elements
	$("#MAVTypes").children("input").prop("checked",false).removeAttr("checked");

	//Set only input element with value attribute set to 'mode'
	$("#MAVTypes > [value='" + type + "']").attr('checked',true).prop('checked',true);
	
	//Refresh the UI with the newly selected elements (sheesh - this is a bit crap of JQuery)
	//http://stackoverflow.com/questions/5145728/jquery-manually-set-buttonset-radios
	$("#MAVTypes").children("input").button("refresh") ;

	return this ;
} ;

/**
 * Method for taking the activity specified in the dialog and storing in MAVsettings instance
 */
MAVsettings.prototype.saveActivityType = function()
{
	//Get the settings from the dialog
	//http://stackoverflow.com/questions/8908943/get-the-currently-selected-radio-button-in-a-jquery-ui-buttonset-without-binding
	var activityType = $("#MAVTypes :radio:checked").attr('value') ;

	if(activityType == null)
		throw "No Activity Type selected" ;

	//Store them back into instance
	this.JSON.activityType = activityType ;

	return this ;
} ;

/**
 * Method for loading the display mode from GM and updating the dialog
 */
MAVsettings.prototype.loadDisplayMode = function()
{
	//Make sure JSON has been loaded from GM
	this.loadJSON() ;
	
	//Get the relevant info from the json for the display mode
	var mode = this.JSON.displayMode ;
	
	//Preset dialog with the stored settings
	//Unset all input elements
	$("#MAVdisplayModes").children("input").prop("checked",false).removeAttr("checked");

	//Set only input element with value attribute set to 'mode'
	$("#MAVdisplayModes > [value='" + mode + "']").attr('checked',true).prop('checked',true);
	
	//show the correct legend
	if ( mode == "T" ) {
		$("#MAVdisplaySizeLegend").show();
	}
	else if ( mode == "C" ) {
		$("#MAVdisplayColourLegend").show();
	}
	
	//Refresh the UI with the newly selected elements (sheesh - this is a bit crap of JQuery)
	//http://stackoverflow.com/questions/5145728/jquery-manually-set-buttonset-radios
	$("#MAVdisplayModes").children("input").button("refresh") ;

	return this ;
} ;

/**
 * Method for taking the display mode specified in dialog and storing in MAVsettings instance
 */
MAVsettings.prototype.saveDisplayMode = function()
{
	//Get the settings from the dialog
	//http://stackoverflow.com/questions/8908943/get-the-currently-selected-radio-button-in-a-jquery-ui-buttonset-without-binding
	var displayMode = $("#MAVdisplayModes :radio:checked").attr('value') ;

	if(displayMode == null)
		throw "No Display Mode selected" ;

	//Store them back into instance
	this.JSON.displayMode = displayMode ;

	return this ;
} ;

/**
 * Method for taking the selected groups from dialog and storing in MAVsettings instance
 */
MAVsettings.prototype.saveGroups = function()
{
	//Get the settings from the dialog
	//http://stackoverflow.com/questions/8908943/get-the-currently-selected-radio-button-in-a-jquery-ui-buttonset-without-binding
	var selectedGroups = [] ;
	$("#MAVGroupData :checkbox:checked").each
	(
		function (i)
		{
			selectedGroups.push($(this).attr('value')) ;
		}
	) ;
	if(debug) console.log('selected groupids='+selectedGroups) ;

	if(selectedGroups.length == 0)
		throw "No Student Groups Selected" ;

	//Store them back into instance
	this.JSON.groups = selectedGroups ;

	return this ;
} ;

/**
 * Method for loading the selected groups from GM and updating the dialog
 */
MAVsettings.prototype.loadGroups = function()
{
	//Make sure JSON has been loaded from GM
	this.loadJSON() ;
	
	//Get the relevant info from the json for the display mode
	var groups = this.JSON.groups ;
	
	//If groups is not yet initialised, then make it set to "All Groups"
	if(groups == null)
		groups = [ 0 ] ;

	//Preset dialog with the stored settings
	
	//Unset all input elements
	$("#MAVGroupData").children("input").prop("checked",false).removeAttr("checked");

	//Foreach group id previously selected, if it still exists set it again in dialog
	for(var i = 0 ; i < groups.length; i++)
	{
		//Set only input element with value matching group id
		$("#MAVGroupData > [value='" + groups[i] + "']").attr('checked',true).prop('checked',true);
	}

	return this ;
} ;


/**
 * Method to load JSON from Greasemonkey into object instance
 * 
 * @param   {Type} MAVsettings Description
 * 
 * @returns {MAVsettings} This object for chaining
 */
MAVsettings.prototype.loadJSON = function()
{
	if (this.JSON == null)
	{
		var GM_json = GM_getValue("course_"+this.courseid) ;
		if(GM_json == null || GM_json == '') //If no settings for this course
		{
			this.JSON = clone(this.defaultJSON) ; // Use default
		}
		else
		{
			this.JSON = $.parseJSON(GM_json) ; //Otherwise set out instance
		}
		//Make sure that student option from default isn't included as that
		//is only relevant for urlMode
		delete this.JSON.student ;
	}

	return this ;
} ;

/**
 * Method for updating the dialog with all the settings for this course stored in GM
 */
MAVsettings.prototype.updateDialog = function()
{
	//Load dialog settings for activity type
	this.loadActivityType() ;
	
	//Load dialog settings for display mode
	this.loadDisplayMode() ;
	
	//Get list of groups for course & insert into dialog
	this.getCourseGroups() ;
} ;

/**
 * Method to save JSON to Greasemonkey from object instance
 * 
 * @returns {MAVsettings} This object for chaining
 */
MAVsettings.prototype.saveJSON = function()
{
	//get activity type settings 
	this.saveActivityType() ;

	//get display mode settings
	this.saveDisplayMode() ;
	
	//get selected groups settings
	this.saveGroups() ;
	
	//set the mav version
	this.JSON.mavVersion = mavVersion ;
	
	//Don't save the student option as this is only for urlMode
	//TODO This might need to be rethought into the future
	delete this.JSON.student ;
	
	//Store in GM
	GM_setValue("course_"+this.courseid,JSON.stringify(this.JSON)) ;
	
	return this ;
} ;

/**
 * This method will return the settings data structure to be converted to JSON
 */
MAVsettings.prototype.getJSON = function()
{
	if(this.JSON == null)
	  this.loadJSON() ;

	return this.JSON ;
}

/**
 * Method for using ajax to retrieve all groups for this course and then it call
 * loadGroups method to update the dialog with the selected groups
 *
 * @todo This needs to be refactored into the balmi class
 */
MAVsettings.prototype.getCourseGroups = function()
{
	var data = JSON.stringify({ "courselink": balmi.getCoursePageLink().href }) ;

	var settings = this ;
	
  var xhr = $.ajax
  (
    {
      url: balmiServerHome+'/getCourseGroups.php',
      xhr: function(){return new GM_XHR();}, //Use GM_xmlhttpRequest
      type: 'GET',
      data: { "json": data },
      dataType: 'json', 
      success: function(data)
      {
				if(debug) console.log(data) ;
				$("#MAVGroupData").html(data.html) ;
				settings.loadGroups() ;
      },
      error: function(xhr,status,message)
      {
        if(debug) console.log('status='+status) ;
        if(debug) console.log('message='+message) ;
      },
			complete: function(xhr,status)
			{
				if(debug) console.log('status='+status) ;
				//TODO: Hide the progress spinning wheel
			}
    }
  ) ;
	
} ;


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//Update page contents
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Generate json for ajax request to server for data
 * 
 */
function generateJSONRequest()
{
console.log( "1000. ****** starting JSON request " );
	var courseLink = balmi.getCoursePageLink() ;
	//If no course link found in breadcrumbs, then not on a course page
	if (courseLink == null)
		exit ;
	
	if(debug) console.log('course link='+courseLink.href) ;
	
	//Parse the page for moodle links, assemble and generate a JSONP request to get
	//the stats
	
	//links = balmi.getMoodleLinks() ;
//    links = balmi.getMoodleActivityLinks();
    links = balmi.getMoodleUserLinks();

	requestData(courseLink,links) ;
}

/**
 * Make AJAX request to server to get data to render on page
 * 
 * @param   {String} courseLink The url for the course home page
 * @param   {Object} links    Object with properties holding the links
 * 
 */
function requestData(courseLink,links)
{
	//Input for the getActivity.php script to work with
	var settings = MAVcourseSettings.getJSON() ;
	var data = JSON.stringify
	(
		{
			'mavVersion': mavVersion,
			'settings': settings,
			'courselink': courseLink.href,
			'users': links
		}
	) ;
	
   settings.activityType = 'A';
console.log( "settings: %o", settings );
	if(debug) console.log(data) ;
	
	//var request = $.post
	//(
	//	balmiServerHome+'/getActivity.php',
	//	{ "json": escape(data) },
	//	function(data)
	//	{
	//		console.log("Data loaded: "+data) ;
	//	},
	//	"json"
	//) ;

console.log('*******request going to '+balmiServerHome+'/getActivity.php');
  var xhr = $.ajax
  (
    {
      url: balmiServerHome+'/getActivity.php',
      xhr: function(){return new GM_XHR();}, //Use GM_xmlhttpRequest
      type: 'POST',
      data: { "json": data },
      dataType: 'json', 
      success: function(data)
      {
				updatePage(data) ;

				//Now that the page has been updated with stats, if in urlmode, update
				//the links to include the urlmode url fragment
				if (MAVcourseSettings.isUrlMode())
					urlModeUpdateMoodleLinks() ;
      },
      error: function(xhr,status,message)
      {
        if(debug) console.log('status='+status) ;
        if(debug) console.log('message=****'+message+'balmeiServierHome='+balmiServerHome) ;
      },
			complete: function(xhr,status)
			{
				if (debug)
					console.log('status='+status) ;
			}
    }
  ) ;
	
	//TODO: Display a second dialog that has spinning wheel and a cancel button
	//If cancel button is pressed, then call xhr.abort() to abort the ajax request
	//http://stackoverflow.com/questions/446594/abort-ajax-requests-using-jquery
	

}

function updatePage(data)
{
	//do stuff with JSON
	if(debug) console.log(data) ;
	
	var activityType = data.settings.activityType ;
	var displayMode = data.settings.displayMode ;
	
	//How to quantify the number in the page 
	var activityText;
	
//alert( " DOES THIS WORK " );
	
	var allLinks = document.getElementsByTagName("a") ;

    var userRE = /^(?:http?:\/\/)?usqstudydesk.usq.edu.au\/m2\/user\/view.php?[^"]*id=([0-9]+).*$/ ;
	
    var element;  var info;   

	for (var i=0; i < allLinks.length; i++) {
//    ${allLinks}.each(function(i,link) {
        //****** CHANGE THE USER LINKS TO HAVE BIND THEM

        element = allLinks[i];

        info = element.href.match(userRE) ;
        var link = element.href;
   //     var info = link.href.match(userRE) ;
        var userID;

       //alert( "user id is " + userid );
        if ( info != null ) {
//alert( i + "i link is " + element.href + " userid " + info[1] );
//alert( i + "i link is " + link.href + " userid " + info[1] );

            userID = info[1];
            //** add an id to the link "user_#id"
            //allLinks[i].setAttribute( "id", "user_"+userID );
            element.style.backgroundColor = "#ffffcc";
//            element.setAttribute( "id", "user_"+userID );
            $(element).after('<a data="'+userID+'" class="showMoreUserDetailsLink"><small>&nbsp;[details]&nbsp;</small></a>' );
            //$("#user_"+userID).on('mouseover',function(){getUserDetails(userID);});
            $(".showMoreUserDetailsLink").click(
                    function() {
                        var id = $(this).attr("data");
                        getUserDetails(id);
                    }
            );
            //$("#user_"+userID).mouseleave(function(){getUserDetails(userID);});
//            allLinks[i].id = "user_"+userID;
        }

	}

}


function getUserDetails(id) {

    // If no course link found in breadcrumbs, then not on a course page
    var courseLink = balmi.getCoursePageLink() ;
    if (courseLink == null) exit ;

    pageLink = window.location;

    var settings = MAVcourseSettings.getJSON();
    var data = JSON.stringify (
        {
            'mavVersion': mavVersion, 
            'courselink': courseLink.href,
            'userID': id
        }
    );

    var xhr = $.ajax (
        {
            url: balmiServerHome+'/getUserDetails.php',
            xhr: function() { return new GM_XHR(); },
            type: 'POST',
            data: { "json": data },
            datatype: 'json',
            success: function(data) {
                $("#moreStudentDetails").html( data );
                // let's just open the dialog box
                $("#MAVextraUserDetailsDialog").dialog(
                    {
                        width: 300, height: 'auto',
                        //title: "Student Details ("+id+")",
                        modal: true,
                        fontsize:10,
                        closeOnEscape: true,
                        buttons: {
                            "Ok": function() {
                                // STOP your greesemonkey update here
                                $(this).dialog("close");
                            }
                        }
                    }
                );
                $("#MAVextraUserDetailsDialog").siblings('div.ui-dialog-titlebar').remove();
            },
            error: function(xhr,status,message) {
                if (debug) console.log('status= error'+status);
                if (debug) console.log('message= error '+message );
            },
            complete: function(xhr,status) {
                if (debug) console.log('status complete='+status);
            }
        }
    );


}
///////////////////////////////////////////////////////////////////////////////
//Utility Functions
///////////////////////////////////////////////////////////////////////////////

/**
 * Add jquery-ui css to GM sandbox using GM_addStyle and rewrite any url(paths)
 * to be absolute according to the mav_config.getJqueryHtml() URI
 *
 * eg.
 *
 * change:
 * url(images/ui-bg_glass_75_ccdc6a_1x400.png)
 * to:
 * url(https://host.cqu.edu.au/html/images/ui-bg_glass_75_ccdc6a_1x400.png)
 * 
 * @param   {string} jQueryCSS CSS for jquery-ui (eg. contents of jquery-ui-1.10.2.custom.css)
 */
function addCSS(css)
{
	//Make jQuery images load from mav server
	css = css.replace(/url\((images\/ui-[^\.]+.png)\)/gm,"url(" + mavJqueryHtml + "/$1)") ;
	GM_addStyle(css) ;	
}

/**
 * Function to make a copy of an object
 * 
 * @param   {Object} obj Object to copy
 * 
 * @returns {Object} Returns a copy of obj public properties
 */
function clone(obj)
{
	if (null == obj || "object" != typeof obj) return obj;
	var copy = obj.constructor();
	for (var attr in obj)
	{
		if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
	}
	return copy;
}

/**
 * Does str string end with suffix
 *
 * http://stackoverflow.com/questions/280634/endswith-in-javascript/280644
 
 * @param   {string} str      String for substring match
 * @param   {string} suffix   String to match at end of str
 * 
 * @returns {boolean} True if str ends with suffix otherwise false
 */
function endsWith(str, suffix)
{
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}



///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//START OF SCRIPT
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////
//Configure server paths
///////////////////////////////////////////////////////////////////////////////
var balmi_config = new balmi_config() ;
var mav_config = new mav_config() ;

console.log( "**** 1. got the config stuff" );
/**
 * @type string Absolute URI to the location of balmi API scripts
 */
var balmiServerHome = balmi_config.getServerApi() ;

console.log( "**** 2. got ServerHome" );
/**
 * @type string Absolute URI to the location of jQuery & jQuery-ui theme files
 */
var mavJqueryHtml = mav_config.getJqueryHtml() ;

console.log( "**** 3. got jQuery html" );
/**
 * @type string Absolute URI to supporting HTML files for MAV (such as busy animation icon)
 */
var mavHtml = mav_config.getHtml() ;

console.log( "**** 4. got config html" );
/**
 * @type string Get version of MAV greasemonkey script
 */
var mavVersion = mav_config.getVersion() ; //GM_info.script.version ;


console.log( "**** 5. mavVersion " + mavVersion );
/**
 * @type balmi An instance of balmi object to interact with moodle page and balmi API server
 */
var balmi = new balmi(balmi_config) ;

/**
 * @type string Get version of balmi library
 */
var balmiVersion = balmi.getVersion() ;

//Turn on/off debugging
var debug = balmi_config.getDebug() ;

if (debug)
{
    console.log( "David is here" );
	console.log('balmiServerHome='+balmiServerHome) ;
	console.log('mavJqueryHtml='+mavJqueryHtml) ;
	console.log('mavVersion='+mavVersion) ;
	console.log('userid='+balmi.getLoggedInUserIdNumber()) ;
	console.log('fullname='+balmi.getLoggedInUserFullname()) ;
    console.log( "and is finished here" );
}

//If there is no course home page link in the breadcrumbs, then this is not
//a course site in moodle (probably home page)
if(balmi.getCoursePageLink() == null)
	exit ;

console.log( "**** 6. Got course page link" );
//***** djMAV kludge - only work for the single EDC3100 course
var courseId = balmi.getCourseId() ;
if ( courseId != 4688 )
    exit;

console.log( "**** 7. Got Course ID" );
///////////////////////////////////////////////////////////////////////////////
//Add jQuery and MAV CSS to page
///////////////////////////////////////////////////////////////////////////////
var jQueryCSS = GM_getResourceText("jQueryCSS") ;
addCSS(jQueryCSS) ;

if (debug) console.log('jquery css added') ;

var mavCSS = GM_getResourceText("mavCSS") ;
GM_addStyle(mavCSS) ;

console.log( "**** 8. style etc added" );
///////////////////////////////////////////////////////////////////////////////
//Adding the dialog to the page
///////////////////////////////////////////////////////////////////////////////
//Get the div for the dialog
var MAVcourseSettings = new MAVsettings(balmi.getCourseId()) ;
var settingsDialogDiv = GM_getResourceText('settingsDialogDiv') ;
$("body").append(settingsDialogDiv);	

if (debug)
	console.log('Just before adding busy animation div') ;

///////////////////////////////////////////////////////////////////////////////
//Adding the busy animation to the page
///////////////////////////////////////////////////////////////////////////////
//Add the hidden div to the page, and set the src for the image inside the div
var busyAnimationDiv = GM_getResourceText('busyAnimationDiv') ;
$("body").append(busyAnimationDiv) ;
if (debug)
	console.log('Got after inserting busyanimationdiv') ;

$("#MAVbusyAnimationImage").attr('src',mavHtml+'/'+$("#MAVbusyAnimationImage").attr('src')) ;
if (debug)
	console.log('Got after updating src attribute for animation image') ;

//Configure div to show and hide during ajax calls
$(document).ajaxStart
(
	function()
	{
		$("#MAVbusyAnimationImage").hide();
		//alert("Busy on") ;
	}
) ;
$(document).ajaxComplete
(
	function()
	{
		//close the loading animation
		$("#MAVbusyAnimationImage").hide();
	}
) ;

if (debug)
	console.log('Got after ajaxsetup') ;

///////////////////////////////////////////////////////////////////////////////
//Add Activity Viewer Links to page
///////////////////////////////////////////////////////////////////////////////
//window.addEventListener ("load", function() {mavAddActivityViewerSwitch(balmi)}, false);

///////////////////////////////////////////////////////////////////////////////
//Add link to SSI in the Support block within course site
///////////////////////////////////////////////////////////////////////////////
//window.addEventListener("load", function() {mavAddSSILink(balmi)}, false) ;

///////////////////////////////////////////////////////////////////////////////
//If activity viewer is turned on, then update the page
///////////////////////////////////////////////////////////////////////////////
window.addEventListener ("load", mavUpdatePage, false);


///////////////////////////////////////////////////////////////////////////////
//Bind functions for the dialog button clicks
///////////////////////////////////////////////////////////////////////////////

$("#MAVdisplayTextSize").bind("click", function() {
	$("#MAVdisplayColourLegend").hide();
	$("#MAVdisplaySizeLegend").fadeIn();
});
$("#MAVdisplayColour").bind("click", function() {
	$("#MAVdisplaySizeLegend").hide();
	$("#MAVdisplayColourLegend").fadeIn();
});


///////////////////////////////////////////////////////////////////////////////
//END OF PROGRAM
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


