// ==UserScript==
// @name          gradebookFix
// @namespace	  http://davidtjones.wordpress.com
// @description	  Update the peoplesoft gradebook to make it useful
// @version       0.9.6
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_listValues
// @include       https://cs90prd.usq.edu.au/psp/cs90prd/EMPLOYEE/HRMS/*
// ==/UserScript==

//*******************************************************************
// isSuppRange( result )
// return true iff the result is in the supp range

function isSuppRange( result ) {

    if ( result >= 45 && result < 49.5 ) {
        return true;
    }
    return false;
}

//*******************************************************************
// isBorderline( result )
// return true iff the result is on the borderline between a grade division

function isBorderline( result ) {
    // what is the result for this student
//    var resultId = "STDNT_GRADE_HDR_GRADE_AVG_CURRENT$" + studentNum;
 //   var resultEntry = element.getElementById( resultId );
  //  var result = resultEntry["textContent"];

    if ( result < 50 && result >= 49.5 ) {
    //if ( result < 30 && result >= 29 ) {
        return true;
    } else if ( result < 65 && result >= 64.5 ) {
    //} else if ( result < 45 && result >= 44 ) {
        return true;
    } else if ( result < 75 && result >= 74.5 ) {
    //} else if ( result < 53 && result >= 52 ) {
        return true;
    } else if ( result < 85 && result >= 84.5 ) {
    //} else if ( result < 54 && result >= 53 ) {
        return true;
    }
    return false;
}

//*******************************************************************
// calcOveride( result )
// return the letter grade that will be used to override the existing
// grade

function calcOverride( result ) {

    if ( result < 50 && result >= 49.5 ) {
    //if ( result < 30 && result >= 29 ) {
        return "F"; // this should be nothing given problems with which F grade
    } else if ( result < 65 && result >= 64.5 ) {
    //} else if ( result < 45 && result >= 44 ) {
        return "C";
    } else if ( result < 75 && result >= 74.5 ) {
    //} else if ( result < 53 && result >= 52 ) {
        return "B";
    } else if ( result < 85 && result >= 84.5 ) {
    //} else if ( result < 54 && result >= 53 ) {
        return "HD";
    }
    return "";
}

//*******************************************************************
// changeBackground( element, studentNum, colour )
// change the background colour for a given row to a given colour

function changeBackground( element, studentNum, colour ) {

    var labels = [ "win0divHCR_PERSON_NM_I_NAME$", 
                    "win0divSTDNT_GRADE_HDR_EMPLID$",
                    "win0divSTDNT_GRADE_HDR_GRADE_AVG_CURRENT$",
                    "win0divSTDNT_GRADE_HDR_COURSE_GRADE_CALC$",
                    "win0divSTDNT_GRADE_HDR_CRSE_GRADE_INPUT$" ];
    var arrayLength = labels.length;

    for ( var i = 0; i < arrayLength; i++ ) {
        var id = labels[i] + studentNum;
        var name = element.getElementById( id );
        name.style.backgroundColor = colour;
    }
}

//*******************************************************************
// addHint( element, studentNum, hint )
// given a row, add the textual hint

function addHint( element, studentNum, hint ) {
    var id = "win0divSTDNT_GRADE_HDR_EMPLID$" + studentNum ;
    var newHTML = '<p style="font-size:small">' + hint + "</p>";
    element.getElementById( id ).insertAdjacentHTML('beforeend', newHTML );
}

//*****************************************************************
// missingPeResult( element, studentNum )
// - return TRUE iff the given student is missing a PE result

function missingPeResult( element, studentNum ) {
    var studentID = "STDNT_GRADE_HDR_EMPLID$" + studentNum;
    var studentElement = element.getElementById( studentID );
    var studentRaw = studentElement["textContent"];

    var id = "STUDENT_peResult_" + studentRaw;
    var peResult = GM_getValue( id );

    if ( peResult == "" ) {
        return true;
    }

    if ( peResult == 1 || peResult == 0 ) {
        return false;
    }
    return true;
}

//*******************************************************************
// updateResults( element )
// - given an element in the cummulative grades page, look for information
//   for each student and update the row if they fit any of the criteria

function updateResults(element) {
    var studentNum = 0;

    // the id for the name of every student
    var id = "win0divHCR_PERSON_NM_I_NAME$" + studentNum;
    var name = element.getElementById( id );

    // Have we received an PE results for any students
    var noPeResults = GM_getValue( "NO_PE_RESULTS" );
    var peCourse = GM_getValue( "PE_COURSE" );
console.log( "No pEresults is " + noPeResults + " PE COURSE " + peCourse );

    // loop through all the rows in the table
    while ( name ) {
        // get the numeric result for this student
        var resultId = "STDNT_GRADE_HDR_GRADE_AVG_CURRENT$" + studentNum;
        var result = element.getElementById( resultId );
        var rawResult = result["textContent"];

        // details of the cell/row of the table we're going to change
        var overrideId = "STDNT_GRADE_HDR_CRSE_GRADE_INPUT$" + 
                                            studentNum;
        var overrideBox = element.getElementById( overrideId );
        var overrideValue = overrideBox.getAttribute( "value" );

        // No PE result for this student
        if ( peCourse == 1 && missingPeResult( element, studentNum ) && 
                 noPeResults != 1 ) {
            if ( overrideValue == "" ) {
                changeBackground( element, studentNum, "#9999ff" );
                var hint = "Missing PE result. Change grade to IDM?" ; 
                addHint( element, studentNum, hint );
            } else {
                changeBackground( element, studentNum, "#ffff99" );
                var hint = "Missing PE result. But overridden to " 
                                + overrideValue;
                addHint( element, studentNum, hint );
            }
        // is the student on the borderline for a grade
        } else if ( isBorderline( rawResult ) ) {
            // if not overridden suggest doing so
            if ( overrideValue == "" ) {
                changeBackground( element, studentNum, "#ff9999" );
                var newOverRide = calcOverride( rawResult );
                var hint = "On the borderline. Consider upgrade to " + 
                                newOverRide;
                addHint( element, studentNum, hint );
            } else { 
                changeBackground( element, studentNum, "#99ff99" );
                var hint = "Was on borderline. Already upgraded?";
                addHint( element, studentNum, hint );
            }
        // are they in the supp range
        } else if ( isSuppRange( rawResult )) {
            changeBackground( element, studentNum, "#FFCC00" );
            var hint = "Result between 45 and 49.5%<br />Consider IS/IM";
            addHint( element, studentNum, hint );
        }

        // try to move onto the next student
        studentNum++;
        id = "win0divHCR_PERSON_NM_I_NAME$" + studentNum;
        name = element.getElementById( id );
    }
}

//*****************************************************************
// checkForLink
// - checks to see if the cumulative grades link is on the page and adds a listener
// - if we're on the actual page, call update results

function checkForLink() {

    /// timeout

    var iframes = document.getElementsByTagName( "iframe" );
    for ( var i=0; i<iframes.length; i++ ) {
        var fred = iframes[i];

        // Is the link there, then add the call to this function
        if ( fred["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR3')){
//            alert( "DID get link to cumulative grades" );

            var theLink = fred["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR3');
            theLink.addEventListener( "click", function(){ window.setTimeout( checkForLink, 5000 ); }, false );
            theLink = fred["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR2');
            theLink.addEventListener( "click", function(){ window.setTimeout( checkForLink, 5000 ); }, false );
            theLink = fred["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR1');
            theLink.addEventListener( "click", function(){ window.setTimeout( checkForLink, 5000 ); }, false );

        }

        // is the table of data there?? then modify it
        // old search may not be specific enough
        //if ( fred["contentDocument"].getElementById('win0divHCR_PERSON_NM_I_NAME$0')){
        // the change page
        if ( fred["contentDocument"].getElementById('win0divSTDNT_GRADE_HDR_GRADE_AVG_CURRENT$0')){
            updateResults( fred["contentDocument"] );
        } 
    }
}


//*******************************************************************
// int column = practicumCourse( frame )
// - return id/column number iff we're on the first page of a practicum course

function practicumCourse( frame ) {
console.log( "Start practicum course" );
    var description = 1;
    var id = "DERIVED_LAM_ASSIGNMENT_DESCR_" + description + "$0";
    var name = frame.getElementById( id );

    // loop through all the assignment descriptions for first row
    while ( name ) {
        var rawResult = name["textContent"];

        if ( rawResult == "PRACTICUM" || rawResult == "PROF EXP" ) {
            GM_setValue( "PE_COURSE", 1 );
            return description;
        }

        // see if we can get the next one
        description++;
        id = "DERIVED_LAM_ASSIGNMENT_DESCR_" + description + "$0";
        name = frame.getElementById( id );
    }
    GM_setValue( "PE_COURSE", 0 );
console.log( "NOT A PRACTICTUM COURSE" );
    return -1;
}

//*******************************************************************
// storePracticumResults( column, frame ) 
// - extract the values for practicum located in column number "column"
//         - DERIVED_LAM_GRADE_1$0 
// - also stores the ID number - STDNT_GRADE_HDR_EMPLID$0

function storePracticumResults( column, frame ) {
    var studentNum = 0;
    var peResultID = "DERIVED_LAM_GRADE_" + column + "$" + studentNum;
    var peResultElement = frame.getElementById( peResultID );
    var studentID = "STDNT_GRADE_HDR_EMPLID$" + studentNum;
    var studentElement = frame.getElementById( studentID );

    // delete all the set values for STUDENT_peResult
    // - cleans out potential overlaps
    var keys = GM_listValues();
    for ( var i=0; i < keys.length; i++ ) {
        var t = GM_getValue( keys[i] );
        if ( keys[i].match( /^STUDENT_peResult_/ ) ||
             keys[i].match( /^NO_PE_RESULTS$/ ) ) {
            GM_deleteValue( keys[i] );
        }
    }
//    GM_deleteValue( "NO_PE_RESULTS" );

    // loop through all the rows in the table
    var numPeResults = 0;

    while ( peResultElement ) {
        var rawResult = peResultElement.value;
        var studentRaw = studentElement["textContent"];

        var id = "STUDENT_peResult_" + studentRaw;
        GM_setValue( id, rawResult );
        if ( rawResult != "" ) {
           numPeResults++;
        } 

        studentNum++;
        peResultID = "DERIVED_LAM_GRADE_" + column + "$" + studentNum;
        peResultElement = frame.getElementById( peResultID );
        studentID = "STDNT_GRADE_HDR_EMPLID$" + studentNum;
        studentElement = frame.getElementById( studentID );
    } 
console.log( "STudentnum is " + studentNum + " and PeResults is " + numPeResults );

    if ( numPeResults == 0 && studentNum > 0 ) {
console.log( "Setting no_pe_results " + 1 );
        GM_setValue( "NO_PE_RESULTS", 1 );
    } else {
console.log( "Setting no_pe_results " + 0 );
        GM_setValue( "NO_PE_RESULTS", 0 );
    } 
}



//*******************************************************************
// Run everytime the iframe is loaded
// - sets up a delay to run the checkForLink function after 5000
// - will store practicum results if it's the first page

function iframeLoad(frame) {
    
    if ( ! document.getElementsByTagName( "iframe" ) ) return;

    var iframes = document.getElementsByTagName( "iframe" );
    //for ( var i=0; i<iframes.length; i++ ) {
    for ( var i=0; i<1; i++ ) {
        var theFrame = iframes[i];

        // Can I get a particular element?
        if ( theFrame["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR3')){
//            alert( "DID get link to cumulative grades" );

            var theLink = theFrame["contentDocument"].getElementById('DERIVED_SSR_LAM_SSS_LINK_ANCHOR3');

            //theLink.addEventListener( "click", function(){ alert( "CLICK ON LINK CUMULATIVE" ); }, false );
            theLink.addEventListener( "click", function(){ window.setTimeout( checkForLink, 5000 ); }, false );

        } 
        var practicum = practicumCourse( theFrame["contentDocument"] );
//console.log( "practicum is " + practicum );
        if ( practicum != -1 ) {
            storePracticumResults( practicum, theFrame["contentDocument"] );
        } 
            
    }

  console.log( "end of iframeLoad" );
}

// add a listener for a particular frame loading

var theFrame;
theFrame = document.getElementById('ptifrmtgtframe');
theFrame.addEventListener( "load", function(){ iframeLoad( theFrame ); }, false );


