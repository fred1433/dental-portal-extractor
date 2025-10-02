var brow = (navigator.appName.indexOf('N') !== -1) ? 'N' : 'IE';
var popTextOptions   = "resizable,menubar=no,toolbar=no,width=765,height=550,scrollbars=yes";
window.newWindow = null;
var popWindowName = "defaultPopUp";
    /*
     * Method name - getDocObj()
	 *
     * This function returns the text string that points out the correct 
     * document object of an element, depending on which browser is in use..
     *
     * @param elem -- Id of the element in question
     * @param parent -- Id of the parent element if the element is nested.
	 *
     * @return String containing the correct document object of an element
     */

	function getDocObj(elem,parent) {
	
		if (document.layers) {
		
			if (parent) {
				return "document."+parent+".document."+elem;
			} else {
				return "document."+elem;
			}
            
		} else if (document.all) {
		
			return "document.all."+ elem;
		} else if (document.getElementById) {
		
			//return "document.getElementById('"+elem+"')";
			return "document."+elem;
		}
		
	} // End getDocObj()


    /*
     * Method name - submitPage()
     * Submits the page and sets the hidden key parameter to the required value.
     *
     * @param Encrypted Key
     * @param Forwarding Action
     * @return      None
     */

    function submitPage(encKey, forwardAction)
    {
        alert(' submitPage() called. Encrypted Key is : ' + encKey + ' forwardAction is: ' + forwardAction );
        document.forms[0].action = forwardAction;
        document.forms[0].method = 'POST';
        document.forms[0].encKey.value = encKey;
        document.forms[0].target="_top";        
        document.forms[0].submit();

    } // submitPage()
    
    /*
     * Method name - submitButton()
     * Submits the button and sets the forward action to the passed in value.
     *
     * @param Forwarding Action
     * @return      None
     */
	function submitButton(forwardAction)
    {
	    //alert(' submitButton() called. forwardAction is: ' + forwardAction );
        document.forms[0].action = forwardAction;
        document.forms[0].method = 'POST';
        document.forms[0].target="_top";        
        document.forms[0].submit();
        
	} // End submitButton()

	
	/*
     * Method name - submitForm()
     *
     * Submits the requested form to the requested forward action.
     * There are two other optional functions that may be 
     * performed -- setting the value of a hidden field 'parms' and 
     * requiring that the form be validated prior to submission.
     *  
     * Parameters:
     *
     * formName	 			Name of the the form to submit. This should be  
     *						the value of the name attribute on the form tag.
	 *
     * forwardAction	 	Action that should be taken upon submission.  
     *						Most likely will be a Struts Action Mapping ".do".
     *
     * setParmsField	 	A 'true' or 'false' value indicating whether a
     *						hidden field called 'parms' should be populated
     *						with the text passed in the 'parmsFieldValue'
     *						parameter.
	 *
     * parmsFieldValue 		Text that will be used to populate the   
     *						hidden field 'parms'.
	 *
     * validateFormInput	A 'true' or 'false' value indicating whether
     *						The named form should be validated prior to 
     *						submission.  If this parameter is 'true', the 
     *						function will pass the form object to a function
     *						called 'validateForm'.  A JSP that requires form 
     *						validation should ensure that the page has access
     *						to a 'validateForm' function. Additionally, the form
     *						tag should include the 'onsubmit" attribute:
     *						     onsubmit="return validateForm(this);"     
	 *
     * return      None
     */
     
		function submitForm(formName, forwardAction, setParmsField, parmsFieldValue, validateFormInput) {

			// *** Ensure page has a body  
			//if((typeof(document.body) == "undefined") || (document.body == null)) {
			//alert("youre in 1.5");
			//	return;
			//}

			// *** Create a form object from the passed element id for a form -- 'formName' 
			frmObj =  eval(getDocObj(formName));
						
			if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}

			// *** Check whether or not form level validation should be performed, 
			// *** Submit only valid or non-validated (client-side) forms 
			if(validateFormInput.toLowerCase() == "true") {

				// *** Ensure that a 'validateForm' Function Exists 
				if(window.validateForm == null){
					alert("'validateForm' Function does not exist!");
					return;
				}

				// *** Do not Submit form if it fails validation!!! 
				if (!validateForm(frmObj)){
					return;
				}
				
			} // End 'if(validateForm.toLowerCase() == "true")'

			// *** Set value of 'parms' field on form to 'parmsFieldValue' argument 
			if(setParmsField.toLowerCase() == "true") {

				if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
					alert("No 'parms' field is found in form '" + formName + "'.");
					return;
				}

				frmObj.parms.value = parmsFieldValue;
				
			} // End 'if(setParmsField.toLowerCase() == "true")'
			
			// If the appPath field is on the form, we need to set it.
			if(typeof(frmObj.appPath) == "undefined" || frmObj.appPath  == null){
				//do nothing
			}
			else {
				if(forwardAction ==  "PesEntry") {	     			
				  frmObj.appPath.value = "";	
				}else if ((forwardAction ==  "entryElig") || (forwardAction == "PesEntryElig")) {
				  frmObj.appPath.value = "toEligEntry";
			    }else if ((forwardAction ==  "entrySubmit") || (forwardAction == "PesEntrySubmit"))  {
				  frmObj.appPath.value = "toSubmitEntry";
			    }else if ((forwardAction ==  "entryClaim") || (forwardAction == "PesEntryClaim"))  {
				  frmObj.appPath.value = "toClaimEntry";
			    }else if ((forwardAction ==  "rc_StartUpEFT") || (forwardAction == "PesDirectDeposit"))  {
					frmObj.appPath.value = "toRCDirectDepositEFT";
				}else if (forwardAction ==  "rc_StartUpERA")  {
					frmObj.appPath.value = "toRCDirectDepositERA";					
				}else if (forwardAction ==  "rc_Enroll_StartUpEFT")  {
					frmObj.appPath.value = "toRCEnrollDirectDepositEFT";					
				}else if (forwardAction ==  "rc_Enroll_StartUpERA")  {
					frmObj.appPath.value = "toRCEnrollDirectDepositERA";					
				}else if (forwardAction ==  "claim_StartUpEFT")  {
					frmObj.appPath.value = "toClaimDirectDepositEFT";					
				}else if (forwardAction ==  "claim_Enroll_StartUpEFT")  {
					frmObj.appPath.value = "toClaimEnrollDirectDepositEFT";	
				}else if((forwardAction ==  "Rendering") || (forwardAction == "MultipleProviders")) {	
					clearChatConversation();	
				}else if(forwardAction ==  "SignOut") {
				  frmObj.appPath.value = "SignOut";  
				  delEftBannerCookie(); // Added for 15.3 Rel. EFT Banner 
	 		    }else {
				  frmObj.appPath.value = "";
			    }
			}
				    
			frmObj.action = forwardAction;
			frmObj.method = 'POST';
			frmObj.target="_top";
			frmObj.submit();

    
		
		} // end submitForm() Function
		
		//2022 Added for DPS Phase 2 Release - Starts
		function submitForm2(formName, forwardAction, setParmsField, parmsFieldValue, paramsFieldValue2, paramsFieldValue3, validateFormInput) {

			// *** Ensure page has a body  
			//if((typeof(document.body) == "undefined") || (document.body == null)) {
			//alert("youre in 1.5");
			//	return;
			//}

			// *** Create a form object from the passed element id for a form -- 'formName' 
			frmObj =  eval(getDocObj(formName));
						
			if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}

			// *** Check whether or not form level validation should be performed, 
			// *** Submit only valid or non-validated (client-side) forms 
			if(validateFormInput.toLowerCase() == "true") {

				// *** Ensure that a 'validateForm' Function Exists 
				if(window.validateForm == null){
					alert("'validateForm' Function does not exist!");
					return;
				}

				// *** Do not Submit form if it fails validation!!! 
				if (!validateForm(frmObj)){
					return;
				}
				
			} // End 'if(validateForm.toLowerCase() == "true")'

			// *** Set value of 'parms' field on form to 'parmsFieldValue' argument 
			if(setParmsField.toLowerCase() == "true") {

				if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
					alert("No 'parms' field is found in form '" + formName + "'.");
					return;
				}

				frmObj.parms.value = parmsFieldValue;
				frmObj.parms.value = paramsFieldValue2;
				frmObj.parms.value = paramsFieldValue3;
				
			} // End 'if(setParmsField.toLowerCase() == "true")'
			
			// If the appPath field is on the form, we need to set it.
			if(typeof(frmObj.appPath) == "undefined" || frmObj.appPath  == null){
				//do nothing
			}
			else {
				if(forwardAction ==  "PesEntry") {	     			
				  frmObj.appPath.value = "";	
				}else if ((forwardAction ==  "entryElig") || (forwardAction == "PesEntryElig")) {
				  frmObj.appPath.value = "toEligEntry";
			    }else if ((forwardAction ==  "entrySubmit") || (forwardAction == "PesEntrySubmit"))  {
				  frmObj.appPath.value = "toSubmitEntry";
			    }else if ((forwardAction ==  "entryClaim") || (forwardAction == "PesEntryClaim"))  {
				  frmObj.appPath.value = "toClaimEntry";
			    }else if ((forwardAction ==  "rc_StartUpEFT") || (forwardAction == "PesDirectDeposit"))  {
					frmObj.appPath.value = "toRCDirectDepositEFT";
				}else if (forwardAction ==  "rc_StartUpERA")  {
					frmObj.appPath.value = "toRCDirectDepositERA";					
				}else if (forwardAction ==  "rc_Enroll_StartUpEFT")  {
					frmObj.appPath.value = "toRCEnrollDirectDepositEFT";					
				}else if (forwardAction ==  "rc_Enroll_StartUpERA")  {
					frmObj.appPath.value = "toRCEnrollDirectDepositERA";					
				}else if (forwardAction ==  "claim_StartUpEFT")  {
					frmObj.appPath.value = "toClaimDirectDepositEFT";					
				}else if (forwardAction ==  "claim_Enroll_StartUpEFT")  {
					frmObj.appPath.value = "toClaimEnrollDirectDepositEFT";					
				}else if(forwardAction ==  "SignOut") {
				  frmObj.appPath.value = "SignOut";  
				  delEftBannerCookie(); // Added for 15.3 Rel. EFT Banner 
	 		    }else {
				  frmObj.appPath.value = "";
			    }
			}
				    
			frmObj.action = forwardAction;
			frmObj.method = 'POST';
			frmObj.target="_top";
			frmObj.submit();

    
		
		} // end submitForm() Function
		//2022 Added for DPS Phase 2 Release - Ends

		// Added for EFT 15.3 Release - Starts
		
		function setCookie(cname,cvalue) {
		      document.cookie = cname+"="+cvalue;
		 }

		function getCookie(cname) {
		    var name = cname + "=";
		    var ca = document.cookie.split(';');
		     	    
		    for(var i=0; i<ca.length; i++) {
		        var c = ca[i];
		        while (c.charAt(0)==' '){	c = c.substring(1);   }
		          if (c.indexOf(name) == 0) {
		           	return c.substring(name.length, c.length);
		        }
		    }
		      return "";
		}

		//Returns IE version 
		function isIE (mode) {
			  var myNav = navigator.userAgent.toLowerCase();
			  if(mode=="Quirks"){
				  if((document.compatMode==='CSS1Compat'?'Standards':'Quirks')=='Quirks')
			       return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
			   }else{
				   return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
	   		   }
			}
		
		// Called during X click and pageonload 
		function eftBannerClose(eftclose){
			var banner=getCookie("HomeEftBanner");
			var banObj = document.getElementById("HomeEftBanner");
			if (banner == "" && banObj != null && typeof(banObj)!= "undefined" && eftclose != "eftBanClosed")  {  
				    document.getElementById("HomeEftBanner").style.display = "block";
				    var version = isIE("Quirks"); 
				    if((version >= 7)&&(version <= 10)){
			     	document.getElementById("idClear").style.display = "none";
				    }
			 	 }
			 else if (banner=="" && document.getElementById("HomeEftBanner")!=null && eftclose=="eftBanClosed")  {  // for click
			        setCookie("HomeEftBanner","inactive"); 
			      	document.getElementById("HomeEftBanner").style.display="none";
			      	document.getElementById("idClear").style.display="block";	    
			    }
			}
		
		function delEftBannerCookie(){			
			var banner=getCookie("HomeEftBanner");
			if(banner!=""&&banner=="inactive" ){
		       document.cookie = "HomeEftBanner=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
		    }			
		}
		
		function clearChatConversation(){
			const d = new Date();
			d.setTime(d.getTime() + 1);
			let expires = "expires="+d.toUTCString();
			document.cookie = "net_conversationId=1;" + expires + ";path=/";
			document.cookie = "net_proActiveGreetingsTriggered=false;" + expires + ";path=/";
		}
		
		// Added for EFT 15.3 Release - Ends
		
	function submitFaqEmailForm(formName, forwardAction, setParmsField, parmsFieldValue, validateFormInput) {

			// *** Ensure page has a body  
			//if((typeof(document.body) == "undefined") || (document.body == null)) {
			//alert("youre in 1.5");
			//	return;
			//}
          
			// *** Create a form object from the passed element id for a form -- 'formName' 
			frmObj =  eval(getDocObj(formName));
						
			if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}

			// *** Check whether or not form level validation should be performed, 
			// *** Submit only valid or non-validated (client-side) forms 
			if(validateFormInput.toLowerCase() == "true") {
                
				// *** Ensure that a 'validateForm' Function Exists 
				if(window.validateEmailForm == null){
				alert("validateEmailForm - null");
					alert("'validateForm' Function does not exist!");
					return;
				}

				// *** Do not Submit form if it fails validation!!! 
				if (!validateEmailForm(frmObj)){
								
					return;
				}
				
			} // End 'if(validateForm.toLowerCase() == "true")'

			// *** Set value of 'parms' field on form to 'parmsFieldValue' argument 
			if(setParmsField.toLowerCase() == "true") {

				if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
					alert("No 'parms' field is found in form '" + formName + "'.");
					return;
				}

				frmObj.parms.value = parmsFieldValue;
				
			} // End 'if(setParmsField.toLowerCase() == "true")'
			
			// If the appPath field is on the form, we need to set it.
			if(typeof(frmObj.appPath) == "undefined" || frmObj.appPath  == null){
				//do nothing
			}
			else {
				if(forwardAction ==  "PesEntry") {	     			
				  frmObj.appPath.value = "";	
				}else if ((forwardAction ==  "entryElig") || (forwardAction == "PesEntryElig")) {
				  frmObj.appPath.value = "toEligEntry";
			    }else if ((forwardAction ==  "entrySubmit") || (forwardAction == "PesEntrySubmit"))  {
				  frmObj.appPath.value = "toSubmitEntry";
			    }else if ((forwardAction ==  "entryClaim") || (forwardAction == "PesEntryClaim"))  {
				  frmObj.appPath.value = "toClaimEntry";
			    }else if ((forwardAction ==  "DirectDeposit") || (forwardAction == "PesDirectDeposit"))  {
				  frmObj.appPath.value = "toDirectDeposit";
				}else if(forwardAction ==  "SignOut") {
				  frmObj.appPath.value = "SignOut";  
				  delEftBannerCookie(); // Added for 15.3 Release EFT Banner
				}else {
				  frmObj.appPath.value = "";
			    }
			}
				    
			frmObj.action = forwardAction;
			frmObj.method = 'POST';
			frmObj.target="_top";
			frmObj.submit();

    
		
		} // end submitForm() Function
	
    /*
     * Method name - submitSmForm()
     *
     * Submits the requested form to the requested forward action.
     * There are two other optional functions that may be 
     * performed -- setting the value of a hidden field 'parms' and 
     * requiring that the form be validated prior to submission.
     *  
     * Parameters:
     *
     * formName	 			Name of the the form to submit. This should be  
     *						the value of the name attribute on the form tag.
	 *
     * forwardAction	 	Action that should be taken upon submission.  
     *						Most likely will be a Struts Action Mapping ".do".
     *
     * setParmsField	 	A 'true' or 'false' value indicating whether a
     *						hidden field called 'parms' should be populated
     *						with the text passed in the 'parmsFieldValue'
     *						parameter.
	 *
     * parmsFieldValue 		Text that will be used to populate the   
     *						hidden field 'parms'.
	 *
     * validateFormInput	A 'true' or 'false' value indicating whether
     *						The named form should be validated prior to 
     *						submission.  If this parameter is 'true', the 
     *						function will pass the form object to a function
     *						called 'validateForm'.  A JSP that requires form 
     *						validation should ensure that the page has access
     *						to a 'validateForm' function. Additionally, the form
     *						tag should include the 'onsubmit" attribute:
     *						     onsubmit="return validateForm(this);"     
	 *
     * return      None
     */
     
		function submitSmForm(formName, forwardAction, setParmsField, parmsFieldValue, validateFormInput) {

			// *** Ensure page has a body  
			//if((typeof(document.body) == "undefined") || (document.body == null)) {
			//alert("youre in 1.5");
			//	return;
			//}

			// *** Create a form object from the passed element id for a form -- 'formName' 
			frmObj =  eval(getDocObj(formName));
						
			if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}

			// *** Check whether or not form level validation should be performed, 
			// *** Submit only valid or non-validated (client-side) forms 
			if(validateFormInput.toLowerCase() == "true") {

				// *** Ensure that a 'validateForm' Function Exists 
				if(window.validateForm == null){
					alert("'validateForm' Function does not exist!");
					return;
				}

				// *** Do not Submit form if it fails validation!!! 
				if (!validateForm(frmObj)){
					return;
				}
				
			} // End 'if(validateForm.toLowerCase() == "true")'

			// *** Set value of 'parms' field on form to 'parmsFieldValue' argument 
			if(setParmsField.toLowerCase() == "true") {

				if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
					alert("No 'parms' field is found in form '" + formName + "'.");
					return;
				}

				frmObj.parms.value = parmsFieldValue;
				
			} // End 'if(setParmsField.toLowerCase() == "true")'
			// If the appPath field is on the form, we need to set it.
			if(typeof(frmObj.appPath) == "undefined" || frmObj.appPath  == null){
				//do nothing
			}
			else {
				if(forwardAction ==  "PesEntry") {	     			
				  frmObj.appPath.value = "";	
				}else if ((forwardAction ==  "entryElig") || (forwardAction == "PesEntryElig")) {
				  frmObj.appPath.value = "toEligEntry";
			    }else if ((forwardAction ==  "entrySubmit") || (forwardAction == "PesEntrySubmit"))  {
				  frmObj.appPath.value = "toSubmitEntry";
			    }else if ((forwardAction ==  "entryClaim") || (forwardAction == "PesEntryClaim"))  {
				  frmObj.appPath.value = "toClaimEntry";
			    }else if ((forwardAction ==  "DirectDeposit") || (forwardAction == "PesDirectDeposit"))  {
				  frmObj.appPath.value = "toDirectDeposit";
				}else if(forwardAction ==  "SignOut") {
				  frmObj.appPath.value = "SignOut";  
				  delEftBannerCookie(); // Added for 15.3 Rel. EFT Banner
			    }else {
				  frmObj.appPath.value = "";
			    }
	    	}      
		    frmObj.action = '/prov/execute/'+forwardAction;						
			frmObj.method = 'POST';
			frmObj.target="_top";
			frmObj.submit();

    
		
		} // end submitSmForm() Function		
		
		    
	function linkSubmit(fwdName, formName)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "/prov/execute/Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.target="_top";    	    	
    	frmObj.submit();    								

			    	
        
    } // linkSubmit()
	
	/**
	* Opens the Dental Update Newsletter in a new window.
	*/
	function openNewsletter() {
		var url = "https://metlifedentalproviderupdate.com";
		var windowName = "DentalUpdateNewsletter";
		var windowFeatures = "resizable,menubar=no,toolbar=no,width=800,height=600,scrollbars=yes";
		window.open(url, windowName, windowFeatures);
	}
    
    function linkSubmit4(fwdName,formName)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	   	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	frmObj.action ="/prov/execute/Content" ;
    	
    	frmObj.method = 'POST';
       	frmObj.fwdName.value = fwdName;
    	frmObj.submit();    								

			    	
        
    } // linkSubmit4()
    
    
    
    function linkSubmit2(fwdName, formName, anchor)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.anchor.value = anchor;
    	    	
    	frmObj.target="_top";    	    	
    	frmObj.submit();    								

			    	
        
    } // linkSubmit()
    
    function linkSubmit3(fwdName, formName, externalLink)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.externalLink.value = externalLink;
    	    	
    	frmObj.target="_top";    	    	
    	frmObj.submit();    								

			    	
        
    } // linkSubmit3()
    
    
    function linkSubmitSm(fwdName, formName)
    {
   		
    	frmObj =  eval(getObj(formName));
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.target.value="_top";    	    	
    	frmObj.submit();    								

			    	
        
    } // linkSubmit()
    
    function linkSubmitSm2(fwdName, formName)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.submit();    								

			    	
        
    } // linkSubmit()
   
	function linkOffsiteSubmit(fwdName, formName, offsiteLink)
    {
   		
   		/*
    	alert("fwdName = " + fwdName + "\n" +
    	      "formName = " + formName + "\n" +
    	      "offsiteLink = " + offsiteLink);
    	return;
    	*/
    	      
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	if(frmObj.linkClicked != undefined && frmObj.linkClicked != null && frmObj.linkClicked !=""){
    		var linkClicked = frmObj.linkClicked.value
    		if(linkClicked != null && linkClicked!= "" && linkClicked != undefined){
           		frmObj.linkClicked.value = linkClicked;
         }
    	}	
    	frmObj.action = "Content";
    	
    	frmObj.method = 'POST';
    	frmObj.target = "_self";
    	frmObj.fwdName.value = fwdName;
    	frmObj.externalLink.value = offsiteLink;
    	frmObj.submit();    								

			    	
        
    } // linkSubmit()

    function alert_invalid_ssn3() {    	    
    if(document.DentalActionCommonForm.InputID.value.length == 0) {
	alert("Please enter a valid Social Security Number.");
	document.DentalActionCommonForm.InputID.focus();
	return false; 
     } else {
     	return subForm();
     }
     
   } 
//Added for Dual Provider on 5/25/2009 - Starts
    function alert_invalid_ssnDual() {    	    
    if(document.DentalActionCommonForm.InputID.value.length == 0) {
	alert("Please enter a valid Social Security Number.");
	document.DentalActionCommonForm.InputID.focus();
	return false; 
     } else {
    	if(document.DentalActionCommonForm.values.value == "yes") {
		submitForm('DentalActionCommonForm','ListPlanNova','false','','false');
     	} else {
     	submitForm('DentalActionCommonForm','ListPlan','false','','false');
    	}
     }
   }
   function alert_invalid_ssnDualClaim() {    	    
    if(document.DentalActionCommonForm.InputID.value.length == 0) {
	alert("Please enter a valid Social Security Number.");
	document.DentalActionCommonForm.InputID.focus();
	return false; 
     } else {
    	if(document.DentalActionCommonForm.values.value == "yes") {
		submitForm('DentalActionCommonForm','ListClaimNova','false','','false');
     	} else {
     	submitForm('DentalActionCommonForm','ListClaim','false','','false');
    	}
     }
   }  
    function alert_invalid_ssnDualClaimEFT() {    	    
    if(document.EntryActionCommonForm.InputID.value.length == 0) {
	alert("Please enter a valid Social Security Number.");
	document.EntryActionCommonForm.InputID.focus();
	return false; 
     } else {
    	if(document.EntryActionCommonForm.values.value == "yes") {
		submitForm('EntryActionCommonForm','ListClaimNova','false','','false');
     	} else {
     	submitForm('EntryActionCommonForm','ListClaim','false','','false');
    	}
     }
   }          
//Added for Dual Provider on 5/25/2009 - Ends   
    function alert_invalid_ssn4() {    	    
    if(document.DentalActionCommonForm.InputId.value.length == 0) {
	alert("Please enter a valid Social Security Number.");
	document.DentalActionCommonForm.InputId.focus();
	return false; 
     } else {
     	return subForm();
     }
     
   }   

var submitcount=0;

function subForm() {
   if (submitcount == 0) {
      submitcount++;      
      return true;
   } else {    
      return false;
   }
}

function subForm2() {
var user = document.DentalActionCommonForm.username.value;
var pswd = document.DentalActionCommonForm.password.value;

document.DentalActionCommonForm.username.value=user;
document.DentalActionCommonForm.password.value=pswd;

	if(user.length <= 0 || pswd.length <= 0){
		alert("Please Enter A Username/Password");
		return false;
	}

	if (submitcount == 0) {
		submitcount++;      
		return true;
	} else {    
		return false;
	}

}

function changeToLowerCase() {
var user = document.PesSignIn.username.value.toLowerCase();
var pswd = document.PesSignIn.password.value.toLowerCase();

document.PesSignIn.username.value=user;
document.PesSignIn.password.value=pswd;

	if(user.length <= 0 || pswd.length <= 0){
		alert("Please Enter A Username/Password");
		return false;
	}
}

function userNameValidation() {
var user = document.DentalActionCommonForm.username.value;
document.DentalActionCommonForm.username.value=user;

	if(user.length <= 0 ){
		alert("Please Enter A Username");
		return false;
	}
}

function pwdValidation(flag) {
	var pswd = '';
	if(flag){
		pswd = document.DentalActionCommonForm.password.value;
	}else{
		pswd = document.DentalActionCommonForm.password.value.toLowerCase();
	}
	document.DentalActionCommonForm.password.value=pswd;

	if(pswd.length <= 0 ){
		alert("Please Enter A Password");
		return false;
	}
}


function changeToLowerCase2() {
var user = document.DentalActionCommonForm.userid.value.toLowerCase();

document.DentalActionCommonForm.userid.value=user;

   return true;
}


function setVisible(field)
{
	obj = eval(getObj(field));	
	eval('obj.visibility="visible"');

}

function setInvisible(field)
{
	obj = eval(getObj(field));
	eval('obj.visibility="hidden"');
} 

function getObj(name)
{
  if (document.getElementById)  
  { 	
  	this.obj = document.getElementById(name);
	this.style = document.getElementById(name).style;
  	return style;
  }
  else if (document.all) 
  {   
	this.obj = document.all[name];
	this.style = document.all[name].style;
	return style;
  }
  else if (document.layers)
  {  
   	this.obj = document.layers[name];
   	this.style = document.layers[name];
   	return style;
  }
}
function OpenNewWindow(formName, action, winName, features, param) 
{ 
	var brow = '';

	if (navigator.appName.indexOf('N') != -1) 
	{
		if (navigator.appVersion.charAt(0) == "4")
		{
			brow = 'N4';
		}
		else
		{
			brow = 'N6';
		}
	} 
	else 
	{
		brow = 'IE';
	}
	
	if (features.length <= 0) {
		features = popTextOptions;
	}
	
	frmObj =  eval(getDocObj(formName));

	// Open a pop up window.
	newWindow = window.open("",winName,features);
	newWindow.focus();
	frmObj.target = winName;
    frmObj.action = action;
	frmObj.method = 'POST';
    frmObj.submit();	
		
	if(brow != 'N4') {
		frmObj.target = "";		
		frmObj.action = "";
	}
}

function OpenNewWindow2(formName, fwdName, winName, features, param) 
{ 
	var brow = '';
	if (navigator.appName.indexOf('N') != -1) 
	{
		if (navigator.appVersion.charAt(0) == "4")
		{
			brow = 'N4';
		}
		else
		{
			brow = 'N6';
		}
	} 
	else 
	{
		brow = 'IE';
	}
	if (features.length <= 0) {
		features = popTextOptions;
		alert("111111111 features <= 0");
	}
		frmObj =  eval(getDocObj(formName));
	
	// Open a pop up window.
	newWindow = window.open("",winName,features);
	newWindow.focus();
		
	frmObj.target = winName;
    frmObj.action = "Content";
    frmObj.fwdName.value = fwdName;
	frmObj.method = 'POST';
    frmObj.submit();	
  		
	if(brow != 'N4') {
		frmObj.target = "";		
		frmObj.action = "";
	}	
}
function OpenNewWindowAfterClose(formName, action, winName, features, parmsFieldValue) 
{ 
	var brow = '';

	if (navigator.appName.indexOf('N') != -1) 
	{
		if (navigator.appVersion.charAt(0) == "4")
		{
			brow = 'N4';
		}
		else
		{
			brow = 'N6';
		}
	} 
	else 
	{
		brow = 'IE';
	}
	
	if (features.length <= 0) {
		features = popTextOptions;
	}
	
	frmObj =  eval(getDocObj(formName));
	
	if(newWindow){
		newWindow.close();
	}
	
	if (winName.length <= 0) {
		winName = popWindowName;
	}
	
	if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
	//Do nothing
	}
	else {
		frmObj.parms.value= parmsFieldValue;
	}	
	// Open a pop up window.
	newWindow = window.open("",winName,features);
	newWindow.focus();
	frmObj.target = winName;
    frmObj.action = action;
	frmObj.method = 'POST';
    frmObj.submit();	
		
	if(brow != 'N4') {
		frmObj.target = "";		
		frmObj.action = "";
	}
}
function autoTab(curField,len, nextField) {             
           if(curField.value.length >= len)
           {
              nextField.focus();
           }
} 

// if the user moves to the Find A Dentist zip code field, 
// clear the field, and make sure they can enter 5 chars max.
// Only clear the field the first time they set focus to the field.
var zipEntryFixed = 0;
function fixZipEntry(obj) {
    if (zipEntryFixed == 0) {
        zipEntryFixed = 1;
        obj.value = "";
        obj.maxLength = 5;
    }
}

/**
 * DHTML email validation script. Courtesy of SmartWebby.com (http://www.smartwebby.com/dhtml/)
 */

function echeck(str) {

		var at="@"
		var dot="."
		var lat=str.indexOf(at)
		var lstr=str.length
		var ldot=str.indexOf(dot)
		if (str.indexOf(at)==-1){
		   
		   return false
		}

		if (str.indexOf(at)==-1 || str.indexOf(at)==0 || str.indexOf(at)==lstr){
		   
		   return false
		}

		if (str.indexOf(dot)==-1 || str.indexOf(dot)==0 || str.indexOf(dot)==lstr){
		    
		    return false
		}

		 if (str.indexOf(at,(lat+1))!=-1){
		    
		    return false
		 }

		 if (str.substring(lat-1,lat)==dot || str.substring(lat+1,lat+2)==dot){
		    
		    return false
		 }

		 if (str.indexOf(dot,(lat+2))==-1){
		    
		    return false
		 }
		
		 if (str.indexOf(" ")!=-1){
		    
		    return false
		 }

 		 return true					
	}

	/**
	 * opens popup window.  Caller must pass in features argument
	 */
	function openPopupWindow(name,url,features){
   		popup = window.open(url,name,features);
   		popup.focus();
   	}
   	//Added method for TRIDION URL link as part of TRICARE Change
	function linkSubmitTRIDION(fwdName, formName)
    {
   		
    	frmObj =  eval(getDocObj(formName));
    	
    	    	
    	if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}
    	
    	frmObj.action = "/prov/execute/Content";
    	
    	frmObj.method = 'POST';
    	    	
    	frmObj.fwdName.value = fwdName;
    	frmObj.target="_blank";    	    	
    	frmObj.submit();    								  
    } //linkSubmitTRIDION Ends

    	/*
     * Method name - submitForm2()
     *
     * Submits the requested form to the requested forward action.
     * There are two other optional functions that may be 
     * performed -- setting the value of a hidden field 'parms' and 
     * requiring that the form be validated prior to submission.
     *  
     * Parameters:
     *
     * formName	 			Name of the the form to submit. This should be  
     *						the value of the name attribute on the form tag.
	 *
     * forwardAction	 	Action that should be taken upon submission.  
     *						Most likely will be a Struts Action Mapping ".do".
     *
     * setParmsField	 	A 'true' or 'false' value indicating whether a
     *						hidden field called 'parms' should be populated
     *						with the text passed in the 'parmsFieldValue'
     *						parameter.
	 *
     * parmsFieldValue 		Text that will be used to populate the   
     *						hidden field 'parms'.
	 *
     * validateFormInput	A 'true' or 'false' value indicating whether
     *						The named form should be validated prior to 
     *						submission.  If this parameter is 'true', the 
     *						function will pass the form object to a function
     *						called 'validateForm'.  A JSP that requires form 
     *						validation should ensure that the page has access
     *						to a 'validateForm' function. Additionally, the form
     *						tag should include the 'onsubmit" attribute:
     *						     onsubmit="return validateForm(this);"     
	 *
     * windowTarget			Values of the target attribute needs to be passed for
     *						the window display. For example: _top or _blank
	 *
     * return      None
     */
     
		function submitForm2(formName, forwardAction, setParmsField, parmsFieldValue, validateFormInput, windowTarget) {

			// *** Create a form object from the passed element id for a form -- 'formName' 
			frmObj =  eval(getDocObj(formName));
						
			if(typeof(frmObj) == "undefined" || frmObj  == null){
				alert("Form Name '" + formName + "' is invalid!");
				return;
			}

			// *** Check whether or not form level validation should be performed, 
			// *** Submit only valid or non-validated (client-side) forms 
			if(validateFormInput.toLowerCase() == "true") {

				// *** Ensure that a 'validateForm' Function Exists 
				if(window.validateForm == null){
					alert("'validateForm' Function does not exist!");
					return;
				}

				// *** Do not Submit form if it fails validation!!! 
				if (!validateForm(frmObj)){
					return;
				}
				
			} // End 'if(validateForm.toLowerCase() == "true")'

			// *** Set value of 'parms' field on form to 'parmsFieldValue' argument 
			if(setParmsField.toLowerCase() == "true") {

				if(typeof(frmObj.parms) == "undefined" || frmObj.parms  == null){
					alert("No 'parms' field is found in form '" + formName + "'.");
					return;
				}

				frmObj.parms.value = parmsFieldValue;
				
			} // End 'if(setParmsField.toLowerCase() == "true")'
			
			frmObj.action = forwardAction;
			frmObj.method = 'POST';
			frmObj.target = windowTarget;
			frmObj.submit();

    
		
		} // end submitForm2() Function
		
		function changeInputType(element_id, newtype) {
			
			var current_input = document.getElementById(element_id);
		    var new_input      = document.createElement('input');
		   
			if (current_input.value.length > 0 && current_input.type != newtype){	
				
				with(new_input) {
					if (current_input.id) id = current_input.id;
					if (current_input.name) name = current_input.name;
					if (current_input.size) size = current_input.size;
					if (current_input.height) height = current_input.height;
					if (current_input.maxLength) maxLength = current_input.maxLength;	
					if (current_input.className) className = current_input.className;
					if (current_input.onchange) onchange = current_input.onchange;
					if (current_input.onblur) onblur = current_input.onblur;
					if (current_input.onclick) onclick = current_input.onclick;
					if (current_input.onfocus) onfocus = current_input.onfocus;
					if (current_input.onkeydown) onkeydown = current_input.onkeydown;
					if (current_input.onkeyup) onkeyup = current_input.onkeyup;
					if (current_input.onmouseover) onmouseover = current_input.onmouseover;
					if (current_input.onmouseout) onmouseout = current_input.onmouseout;
					if (current_input.style.border) {
						style.width = current_input.style.width;
						style.border = current_input.style.border;
					}
					
					type = newtype;
					value = current_input.value;
					
				}
				
			    current_input.parentNode.replaceChild(new_input,current_input);	
			}		
			
			return current_input;
		}
		
		function validateBeforeSubmit(flag) {
			var passValidation = true;
			
			passValidation = validateNewPassword(flag);
			
			var usernameFieldType = document.getElementById("username").type;
			
			if (usernameFieldType == 'text') {				
			
				var userid = document.getElementById("username").value;
				
				document.getElementById('displayUidBlank').style.display = 'none';				
				
				if(userid.length == 0) {
					document.getElementById('username').focus();
					document.getElementById('displayUidBlank').style.display = 'block';
					passValidation = false;
				}
			
				if (passValidation == false) {
					document.getElementById('displayPasswordValidationErrors').style.display = 'block';
					if (null != document.getElementById('sryImg'))
						document.getElementById('sryImg').style.display = 'none';
					if (null != document.getElementById('actionError'))
						document.getElementById('actionError').style.display = 'none';				
				}
				else {
					document.getElementById("username").value = userid.toLowerCase();
				}
			}
			
			return passValidation;
		}
		
		function validateNewPassword(flag) {
			var currentPassword = document.getElementById("password").value;
			var newPassword = document.getElementById("newpassword").value;
			var confirmPassword = document.getElementById("confirmation").value;
			var userid = document.getElementById("username").value;
			
			document.getElementById('displayAllFieldsEmpty').style.display = 'none';
			document.getElementById('displayPasswordEqualsUid').style.display = 'none';
			document.getElementById('displayPasswordEqualsConfirm').style.display = 'none';
			document.getElementById('displayInvalidPasswordFormat').style.display = 'none';
			
			var passValidation = true;
			// All three password fields must be entered.	
			if(currentPassword.length == 0 || newPassword.length == 0 || confirmPassword.length == 0) {
				//alert("You must enter a new password and retype the password in the New Password and Retype Password fields.");
				document.getElementById('newpassword').focus();
				document.getElementById('displayAllFieldsEmpty').style.display = 'block';
				passValidation = false;
			}
			else {
				// The password should not be the same as the userid.	
				if (userid.toLowerCase() == newPassword.toLowerCase()){
					//alert("The password cannot be the same as the User Name.");
					document.getElementById('newpassword').focus();
					document.getElementById('displayPasswordEqualsUid').style.display = 'block';
					passValidation = false;
				}
				if (newPassword != confirmPassword){
					//alert("Your entry in the Confirm New Password field does not match the entry in the Enter New Password field.  Please check the password and re-enter.");
					document.getElementById('newpassword').focus();
					document.getElementById('displayPasswordEqualsConfirm').style.display = 'block';
					passValidation = false;
				}
				
				var maxLength = parseInt(document.getElementById("maxLength").value);
				var minLength = parseInt(document.getElementById("minLength").value);
				var occurOfNumber = parseInt((newPassword.match(/[0-9]/g)||[]).length);
				var occurOfLetter = parseInt((newPassword.match(/[a-zA-Z]/g)||[]).length);
				var occurOfDash = parseInt((newPassword.match(/-/g)||[]).length);
				var occurOfUnderscore = parseInt((newPassword.match(/_/g)||[]).length);
				var pwdKeyword = parseInt((newPassword.match(/password/gi)||[]).length);
				var metKeyword = parseInt((newPassword.match(/metlife/gi)||[]).length);
				
				var lengthOfPassword = occurOfLetter + occurOfNumber + occurOfDash + occurOfUnderscore;
				
				// The password should be the correct length
				//
				// Check to make sure the password only contains letters, numbers, and not more
				// than one underscore character or dash character.
				//
				// The password must contain at least one number and at least one letter.
				//
				// The password cannot contain special characters (i.e. $, @, %).
				//
				if (newPassword.length > maxLength || newPassword.length < minLength ||
					occurOfDash > 1 || occurOfUnderscore > 1 ||
					occurOfLetter < 1 || occurOfNumber < 1 ||
					lengthOfPassword < newPassword.length) {
					//alert("Password must be 8-10 characters in length, and contain at least one letter" +
					//		" and one number. The only special characters allowed are underscores and hyphens. Passwords are not " +
					//		"case sensitive. Password cannot match the User Name.");
					document.getElementById('newpassword').focus();
					document.getElementById('displayInvalidPasswordFormat').style.display = 'block';
					passValidation = false;
				}
				
				if(!(pwdKeyword<1 && metKeyword<1)){
					document.getElementById('newpassword').focus();
					document.getElementById('displayInvalidPasswordFormat').style.display = 'block';
					passValidation = false;
				}
			}
			
			if (passValidation == false) {
				document.getElementById('displayPasswordValidationErrors').style.display = 'block';
				if (null != document.getElementById('sryImg'))
					document.getElementById('sryImg').style.display = 'none';
				if (null != document.getElementById('actionError'))
					document.getElementById('actionError').style.display = 'none';				
			}
			else {
				document.getElementById("password").value = currentPassword; 
				document.getElementById("newpassword").value = newPassword;
				document.getElementById("confirmation").value = confirmPassword;
			}
			
			return passValidation;
		}
		
		function eopOptionSelect(selection){
			if(selection == "dateRange") {
				document.getElementById("dateRangeDiv").style.display = 'block';
				document.getElementById("claimNumberDiv").style.display = 'none';
				document.getElementById("checkNumberDiv").style.display = 'none';
				if(document.getElementById("traceNumberDiv") != null){
					document.getElementById("traceNumberDiv").style.display = 'none';
				}
			} else if(selection == "claimNumber") {
				document.getElementById("dateRangeDiv").style.display = 'none';
				document.getElementById("claimNumberDiv").style.display = 'block';
				document.getElementById("checkNumberDiv").style.display = 'none';
				if(document.getElementById("traceNumberDiv") != null){
					document.getElementById("traceNumberDiv").style.display = 'none';
				}
			} else if(selection == "checkNumber") {
				document.getElementById("dateRangeDiv").style.display = 'none';
				document.getElementById("claimNumberDiv").style.display = 'none';
				document.getElementById("checkNumberDiv").style.display = 'block';
				if(document.getElementById("traceNumberDiv") != null){
					document.getElementById("traceNumberDiv").style.display = 'none';
				}
			} else if(selection == "traceNumber") {
				document.getElementById("dateRangeDiv").style.display = 'none';
				document.getElementById("claimNumberDiv").style.display = 'none';
				document.getElementById("checkNumberDiv").style.display = 'none';
				document.getElementById("traceNumberDiv").style.display = 'block';
			}
		}
		
		function eopOnLoad(){
			document.getElementById("dateRangeDiv").style.display = 'block';
			document.getElementById("claimNumberDiv").style.display = 'none';
			document.getElementById("checkNumberDiv").style.display = 'none';
			if(document.getElementById("traceNumberDiv") != null){
				document.getElementById("traceNumberDiv").style.display = 'none';
			}
		}
		
		function setSSNTraceDhmo(val) {
			if(val == "ssn") {
				document.getElementById('ssn').style.display = 'block';
				document.getElementById('submitSSN').style.display = 'block';
				document.getElementById('trace').style.display = 'none';
				document.getElementById('submitTrace').style.display = 'none';	
				document.getElementById('facility').style.display = 'none';
				if(document.getElementById('footer2')!=null){
				 document.getElementById('footer2').className = 'foot4';
				}else{
				 document.getElementById('footer1').className = 'foot3';
				}
				
				
				if(document.getElementById('dualInd') && document.getElementById('dualInd').value == "true"){
					document.getElementById('dualSSNSubmit').innerHTML = '4';
				} else {
					document.getElementById('dhmoSSNSubmit').innerHTML = '3';
				}
			}
			if(val == "trace") {
				document.getElementById('trace').style.display = 'block';
				document.getElementById('submitSSN').style.display = 'none';
				document.getElementById('submitTrace').style.display = 'block';
				document.getElementById('ssn').style.display = 'none';				
				document.getElementById('facility').style.display = 'block';
				if(document.getElementById('footer2')!=null){
					document.getElementById('footer2').className = 'foot4';
				}else{
					document.getElementById('footer1').className = 'foot3';
				}
				var size = document.getElementById('facilitySize').value;
				if(document.getElementById('dualInd') && document.getElementById('dualInd').value == "true"){					
					if (parseInt(size) > 1){
						document.getElementById('dualTraceSubmit').innerHTML = '5';
					} else {
						document.getElementById('dualTraceSubmit').innerHTML = '4';
					}
				} else {
					if (parseInt(size) > 1){
						document.getElementById('dhmoTraceSubmit').innerHTML = '4';
					} else {
						document.getElementById('dhmoTraceSubmit').innerHTML = '3';
					}
				}
			}
		}
		
		
		function setSSNTrace(val,dollar) {
			if(val == "ssn") {
				if(document.getElementById("traceText") != null)
				{
					document.getElementById("traceText").style.display = 'block';
				}
				document.getElementById('ssn').style.display = 'block';
				document.getElementById('submitSSN').style.display = 'block';
				document.getElementById('trace').style.display = 'none';
				document.getElementById('submitTrace').style.display = 'none';
				document.getElementById('totalAmountDiv').style.display = 'none';
				document.getElementById("displayRedText").style.display = 'none';
        //2022 Modified for DPS-Release Phase 2	
				document.getElementById('vcc').style.display = 'none';
				document.getElementById('submitVCCorPaymentID').style.display = 'none';
				document.getElementById('check').style.display = 'none';
				document.getElementById('submitCheck').style.display = 'none';
				document.getElementById('facility').style.display = 'none';
			}
			if(val == "trace") {
				if(document.getElementById("traceText") != null){
					document.getElementById("traceText").style.display = 'block';
				}
			
				document.getElementById('trace').style.display = 'block';
				document.getElementById('submitTrace').style.display = 'block';
				document.getElementById('totalAmountDiv').style.display = 'block';
				document.getElementById("displayRedText").style.display = 'block';
				
				document.getElementById('ssn').style.display = 'none';
				document.getElementById('submitSSN').style.display = 'none';
        //2022 Modified for DPS Release Phase 2	
				document.getElementById('vcc').style.display = 'none';
				document.getElementById('submitVCCorPaymentID').style.display = 'none';
				document.getElementById('check').style.display = 'none';
				document.getElementById('submitCheck').style.display = 'none';
				if(document.EntryActionCommonForm.values.value == "yes")
				{
					document.getElementById('totalAmountDiv').style.display = 'none';
					document.getElementById('facility').style.display = 'block';
					//document.getElementById("displayRedText").style.display = 'none';
					var size = document.getElementById('facilitySize').value;
					if (parseInt(size) > 1){
						document.getElementById('submitTraceSerialNumber').innerHTML = '5';
					}else{
						document.getElementById('submitTraceSerialNumber').innerHTML = '4';
					}
		        } else if(document.EntryActionCommonForm.values.value == "no") {	
					document.getElementById('facility').style.display = 'none';
					//document.getElementById("displayRedText").style.display = 'none';
					var size = document.getElementById('facilitySize').value;
					if (parseInt(size) > 1){
						document.getElementById('submitTraceSerialNumber').innerHTML = '5';
					}else{
						document.getElementById('submitTraceSerialNumber').innerHTML = '4';
					}
		        }
			}
      //2022 Added for DPS Release Phase 2 - Starts
			if(val == "vcc") {
				if(document.getElementById("traceText") != null){
					document.getElementById("traceText").style.display = 'block';
				}
				document.getElementById('vcc').style.display = 'block';
				document.getElementById('submitVCCorPaymentID').style.display = 'block';
				document.getElementById('totalAmountDiv').style.display = 'block';
				document.getElementById("displayRedText").style.display = 'block';
				document.getElementById('check').style.display = 'none';
				document.getElementById('submitCheck').style.display = 'none';
				document.getElementById('ssn').style.display = 'none';
				document.getElementById('submitSSN').style.display = 'none';
				document.getElementById('trace').style.display = 'none';
				document.getElementById('submitTrace').style.display = 'none';	
				document.getElementById('facility').style.display = 'none';
			}
			if(val == "check") {
				if(document.getElementById("traceText") != null){
					document.getElementById("traceText").style.display = 'block';
				}
				document.getElementById('check').style.display = 'block';
				document.getElementById('submitCheck').style.display = 'block';
				document.getElementById('totalAmountDiv').style.display = 'block';
				document.getElementById("displayRedText").style.display = 'block';
				document.getElementById('vcc').style.display = 'none';
				document.getElementById('submitVCCorPaymentID').style.display = 'none';
				document.getElementById('ssn').style.display = 'none';
				document.getElementById('submitSSN').style.display = 'none';
				document.getElementById('trace').style.display = 'none';
				document.getElementById('submitTrace').style.display = 'none';	
				document.getElementById('facility').style.display = 'none';
			}
      //2022 Added for DPS Release Phase 2 - Ends
		}
		//This function is called on click of submit button in View Claims page for PPO or DUAL provider. 
		function submitTrace() {
			if(document.EntryActionCommonForm.traceNo.value.length == 0) {
				alert("Please enter a valid Trace Number.");
				document.EntryActionCommonForm.traceNo.focus();
				return false; 
			} 
			//PRB0080256 - Trace number passed with the space in between
			else if(document.EntryActionCommonForm.traceNo.value.indexOf(' ')>=0){
				alert("The trace number should not contain spaces.");
				document.EntryActionCommonForm.traceNo.focus();
				return false;
			}
			//else 
			else {
				document.DentalActionCommonForm.traceNumber.value = document.EntryActionCommonForm.traceNo.value;
		    	document.DentalActionCommonForm.totalAmount.value = document.EntryActionCommonForm.totalAmount.value;
		    	
		    	if(document.EntryActionCommonForm.values){
		     		if(document.EntryActionCommonForm.values.value == "yes") {
		     			//document.DentalActionCommonForm.totalAmount.value ="0"
		     			document.DentalActionCommonForm.facilityID.value = document.EntryActionCommonForm.facilityID.value;
		     			submitForm('DentalActionCommonForm','DhmoClaimTrace','false','','false');
		     		} 
		     		else {
		     			if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
		    				alert("Please enter a valid Total Amount.");
		    				document.EntryActionCommonForm.totalAmount.focus();
		    				return false; 
		    			} 
		     			else{
		     			
		     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     			}
		     		}
		     	} else {
		     		if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
						alert("Please enter a valid Total Amount.");
						document.EntryActionCommonForm.totalAmount.focus();
						return false; 
					} 
		     		else{
	     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     		}
	     		}
	    	}
		}
		
		//2022 Added for DPS Phase 2 Release - Starts
		function submitVccorPaymentID(){
			if(document.EntryActionCommonForm.vccNo.value.length == 0) {
				alert("Please enter a valid VCC or Payment ID");
				document.EntryActionCommonForm.vccNo.focus();
				return false;
			}
			
			else {
				//alert("vcc: "+ document.EntryActionCommonForm.vccNo.value);
		    	document.DentalActionCommonForm.vccNumberorPaymentID.value = document.EntryActionCommonForm.vccNo.value;
		    	document.DentalActionCommonForm.totalAmount.value = document.EntryActionCommonForm.totalAmount.value;
		    	if(document.EntryActionCommonForm.values){
		     		if(document.EntryActionCommonForm.values.value == "yes") {
		     			document.DentalActionCommonForm.facilityID.value = document.EntryActionCommonForm.facilityID.value;
		     			submitForm('DentalActionCommonForm','DhmoClaimTrace','false','','false');
		     		} else {
		     			if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
		    				alert("Please enter a valid Total Amount.");
		    				document.EntryActionCommonForm.totalAmount.focus();
		    				return false; 
		    			} 
		     			else{
		     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     			}
		     		}
		     	} else {
		     		if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
						alert("Please enter a valid Total Amount.");
						document.EntryActionCommonForm.totalAmount.focus();
						return false; 
					} 
		     		else{
	     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     		}
	     	}
	    	}
		}

		function submitCheckNumber(){
			if(document.EntryActionCommonForm.checkNo.value.length == 0) {
				alert("Please enter a valid Check Number");
				document.EntryActionCommonForm.checkNo.focus();
				return false;
			} 
			//else 
			else {
		    	document.DentalActionCommonForm.checkNumber.value = document.EntryActionCommonForm.checkNo.value;
		    	document.DentalActionCommonForm.totalAmount.value = document.EntryActionCommonForm.totalAmount.value;
		    	
		    	if(document.EntryActionCommonForm.values){
		     		if(document.EntryActionCommonForm.values.value == "yes") {
		     			document.DentalActionCommonForm.facilityID.value = document.EntryActionCommonForm.facilityID.value;
		     			submitForm('DentalActionCommonForm','DhmoClaimTrace','false','','false');
		     		} else {
		     			if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
		    				alert("Please enter a valid Total Amount.");
		    				document.EntryActionCommonForm.totalAmount.focus();
		    				return false; 
		    			} 
		     			else{
		     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     			}
		     		}
		     	} else {
		     		if(document.EntryActionCommonForm.totalAmount.value.length == 0) {
						alert("Please enter a valid Total Amount.");
						document.EntryActionCommonForm.totalAmount.focus();
						return false; 
					} 
		     		else{
	     			submitForm('DentalActionCommonForm','ClaimTrace','false','','false');
		     		}
	     		}
	    	}
		}
		
		function submitVccorPaymentID2(){
			if(document.DentalActionCommonForm.vccNo.value.length == 0) {
				alert("Please enter a valid VCC or Payment ID");
				document.DentalActionCommonForm.vccNo.focus();
				return false; 
			} else if(document.DentalActionCommonForm.totalAmount.value.length == 0) {
				alert("Please enter a valid Total Amount.");
				document.DentalActionCommonForm.totalAmount.focus();
				return false; 
			} 
			else {
				if(document.DentalActionCommonForm.values){
					if(document.DentalActionCommonForm.values.value == "yes") {
						submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
					} else {
						submitForm('DentalActionCommonForm','/prov/execute/ClaimTrace','false','','false');
					}
				} else {
					submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
				}
	    	}
		}

		function submitCheckNumber2(){
			if(document.DentalActionCommonForm.checkNo.value.length == 0) {
				alert("Please enter a valid Trace Number.");
				document.DentalActionCommonForm.checkNo.focus();
				return false; 
			}
			else if(document.DentalActionCommonForm.totalAmount.value.length == 0) {
				alert("Please enter a valid Total Amount.");
				document.DentalActionCommonForm.totalAmount.focus();
				return false; 
			} 
			else {
				if(document.DentalActionCommonForm.values){
					if(document.DentalActionCommonForm.values.value == "yes") {
						submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
					} else {
						submitForm('DentalActionCommonForm','/prov/execute/ClaimTrace','false','','false');
					}
				} else {
					submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
				}
	    	}
		}
		//2022 Added for DPS Phase 2 Release - Ends
		//2022 Modified for DPS Phase 2 Release - Starts
		// Added for EFT 15.3 Release - Starts
		//This function added for Trace ID link click on ClaimSummary Pages -
		function submitTraceLink(fwdAction,linkval,linval2,linval3) {
			   var searchType = determineSearchType(linval2,linval3);
			   if(searchType == "A" || searchType == "C" || searchType == "F") {
				   document.DentalActionCommonForm.checkNumber.value = linkval;
			   }else if(searchType == "B" || searchType == "D" || searchType == "G") {
				   document.DentalActionCommonForm.traceNumber.value = linkval;
			   }else if(searchType == "E") {
				   document.DentalActionCommonForm.vccNumberorPaymentID.value = linkval;
			   }
		       document.DentalActionCommonForm.paymentVendorInd.value = linval2;
		       document.DentalActionCommonForm.paymentMethod.value = linval3;
		       submitForm2('DentalActionCommonForm',fwdAction,'true',linkval,linval2,linval3,'false');
		}
		
		function determineSearchType(paymentVendorInd,paymentMethod) {
			var searchType = '';
			if(paymentVendorInd == "Zelis"){
				if(paymentMethod == "CHECK" || paymentMethod == "CHK CANCELLED"){
					searchType = "C";
				}else if(paymentMethod == "VCC" || paymentMethod == "VCC CANCELLED"){
					searchType = "E";
				}else{
					searchType = "D";
				}
			}else if(paymentVendorInd == "MetLife"){
				if(paymentMethod == "WEB CHECK" || paymentMethod == "CHK CANCELLED"){
					searchType = "A";
				}else{
					searchType = "B";
				}
			}
			return searchType;
		}
		// Added for EFT 15.3 Release - Ends
		//2022 Modified for 22.4 DPS Phase 2 Release - Ends
		//This function is called on click of submit button in claim summary by trace number page for PPO provider. 
		function submitTrace2() {
			if(document.TraceNumberActionForm.traceNo.value.length == 0) {
				alert("Please enter a valid Trace Number.");
				document.TraceNumberActionForm.traceNo.focus();
				return false; 
			} 
			else {
				document.DentalActionCommonForm.traceNumber.value = document.TraceNumberActionForm.traceNo.value;
				submitForm('DentalActionCommonForm','/prov/execute/ClaimTrace','false','','false');
			}
		}
		//This function is called on click of submit button in claim summary by trace number page for DHMO provider. 
		function submitTrace3() {
			if(document.TraceNumberActionForm.traceNo.value.length == 0) {
				alert("Please enter a valid Trace Number.");
				document.TraceNumberActionForm.traceNo.focus();
				return false; 
			} else {
				document.DentalActionCommonForm.traceNumber.value = document.TraceNumberActionForm.traceNo.value;
				document.DentalActionCommonForm.facilityID.value = document.TraceNumberActionForm.facilityID.value;
				submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
			}
		}
		//This function is called on click of submit button in claimSummaryDhmo page for DHMO or DUAL provider.
		function submitTrace4() {
			if(document.DentalActionCommonForm.traceNumber.value.length == 0) {
				alert("Please enter a valid Trace Number.");
				document.DentalActionCommonForm.traceNumber.focus();
				return false; 
			} else {
				if(document.DentalActionCommonForm.values){
					if(document.DentalActionCommonForm.values.value == "yes") {
						submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
					} else {
						submitForm('DentalActionCommonForm','/prov/execute/ClaimTrace','false','','false');
					}
				} else {
					submitForm('DentalActionCommonForm','/prov/execute/DhmoClaimTrace','false','','false');
				}
	    	}
		}
		function setTraceNumber() {
			document.getElementById('searchByDIV').style.display = 'block';
			document.getElementById('SSNSerialNumber').innerHTML = '3';
			document.getElementById('SSNText').style.display = 'none';
			if(document.getElementById("SSNTraceText") != null) {
				document.getElementById('SSNTraceText').style.display = 'block';
			}
			if(document.EntryActionCommonForm.values.value == "yes") {
				document.getElementById('SSNText').style.display = 'block';
				document.getElementById('SSNTraceText').style.display = 'none';
				document.getElementById('vcc').style.display = 'none';
				document.getElementById('submitVCCorPaymentID').style.display = 'none';
				document.getElementById('check').style.display = 'none';
				document.getElementById('totalAmountDiv').style.display = 'none'; 
				//document.getElementById('totalAmount').style.display = 'none';
				document.getElementById('submitCheck').style.display = 'none';
				document.getElementById('SearchByVCCCheck').style.display = 'none';
				document.getElementById('searchBySSN').checked = true;
				
				
				
				if(document.getElementById('searchBySSN').checked) {
					document.getElementById('ssn').style.display = 'block';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('totalAmountDiv').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'block';
	        		document.getElementById('submitTrace').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'none';	
		        	document.getElementById('facility').style.display = 'none';
		        	document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
					
					
					
				} else if(document.getElementById('searchByTrace').checked) {
					document.getElementById('ssn').style.display = 'none';
					document.getElementById('trace').style.display = 'block';
					document.getElementById('totalAmountDiv').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'block';
					
					document.getElementById('submitSSN').style.display = 'none';
					document.getElementById('submitTrace').style.display = 'block';
					
					var size = document.getElementById('facilitySize').value;
					if (parseInt(size) > 1){
						document.getElementById('submitTraceSerialNumber').innerHTML = '5';
					}
					else{
						document.getElementById('submitTraceSerialNumber').innerHTML = '4';
					}
					document.getElementById('facility').style.display = 'block';
					document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
				}
				else if(document.getElementById('searchByVCCorPaymentID').checked){
					document.getElementById('ssn').style.display = 'none';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'none';
	        		document.getElementById('submitTrace').style.display = 'none';	
		        	document.getElementById('facility').style.display = 'none';
					document.getElementById('vcc').style.display = 'block';
					document.getElementById('totalAmountDiv').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'block';
					
					document.getElementById('submitVCCorPaymentID').style.display = 'block';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
					
					
				}else if(document.getElementById('searchByCheckNumber').checked){
					document.getElementById('ssn').style.display = 'none';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'none';
	        		document.getElementById('submitTrace').style.display = 'none';	
		        	document.getElementById('facility').style.display = 'none';
					document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'block';
					document.getElementById('totalAmountDiv').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'block';
					document.getElementById("displayRedText").style.display = 'block';
					
					
				}
	        } else if(document.EntryActionCommonForm.values.value == "no") {
	        	
	        	document.getElementById('SSNText').style.display = 'none';
				document.getElementById('SSNTraceText').style.display = 'block';
	        	document.getElementById('vcc').style.display = 'block';
				document.getElementById('submitVCCorPaymentID').style.display = 'block';
				document.getElementById('check').style.display = 'block';
				document.getElementById('submitCheck').style.display = 'block';
				document.getElementById('SearchByVCCCheck').style.display = 'block';
	        	document.getElementById('facility').style.display = 'none';
	        	document.getElementById('totalAmountDiv').style.display = 'none';
	      
	        	document.getElementById('searchBySSN').checked = true;
	        	if(document.getElementById('searchBySSN').checked) {
	        		document.getElementById('ssn').style.display = 'block';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('totalAmountDiv').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'block';
					document.getElementById('submitTrace').style.display = 'none';
					document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'none';
					
				} else if(document.getElementById('searchByTrace').checked) {
					document.getElementById('ssn').style.display = 'none';
					document.getElementById('trace').style.display = 'block';
					document.getElementById('submitSSN').style.display = 'none';
					document.getElementById('totalAmountDiv').style.display = 'block';
					document.getElementById('submitTrace').style.display = 'block';
					document.getElementById('submitTraceSerialNumber').innerHTML = '4';
					document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'block';
					
				}else if(document.getElementById('searchByVCCorPaymentID').checked){
					document.getElementById('ssn').style.display = 'none';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'none';
	        		document.getElementById('submitTrace').style.display = 'none';	
		        	document.getElementById('facility').style.display = 'none';
					document.getElementById('vcc').style.display = 'block';
					document.getElementById('totalAmountDiv').style.display = 'block';
					document.getElementById('submitVCCorPaymentID').style.display = 'block';
					document.getElementById('check').style.display = 'none';
					document.getElementById('submitCheck').style.display = 'none';
					document.getElementById("displayRedText").style.display = 'block';
				}else if(document.getElementById('searchByCheckNumber').checked){
					document.getElementById('ssn').style.display = 'none';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'none';
	        		document.getElementById('submitTrace').style.display = 'none';	
		        	document.getElementById('facility').style.display = 'none';
					document.getElementById('vcc').style.display = 'none';
					document.getElementById('submitVCCorPaymentID').style.display = 'none';
					document.getElementById('check').style.display = 'block';
					document.getElementById('totalAmountDiv').style.display = 'block';
					document.getElementById('submitCheck').style.display = 'block';
					document.getElementById("displayRedText").style.display = 'block';
				}
	        }
		}
		function setTraceNumberDhmo() {
			if(document.DentalActionCommonForm.values.value == "yes") {
				document.getElementById('searchByDIV').style.display = 'block';
				document.getElementById('SSNSerialNumber').innerHTML = '3';
				if(document.getElementById('searchBySSN').checked) {
					document.getElementById('ssn').style.display = 'block';
	        		document.getElementById('trace').style.display = 'none';
	        		document.getElementById('submitSSN').style.display = 'block';
	        		document.getElementById('submitTrace').style.display = 'none';
	        		document.getElementById('dualSSNSubmit').innerHTML = '4';	
		        	document.getElementById('facility').style.display = 'none'
		        	if(document.getElementById('footer2')!=null){
					   document.getElementById('footer2').className = 'foot4';
					}else{
						document.getElementById('footer1').className = 'foot3';
					}
				} else if(document.getElementById('searchByTrace').checked) {
					document.getElementById('ssn').style.display = 'none';
					document.getElementById('trace').style.display = 'block';
					document.getElementById('submitSSN').style.display = 'none';
					document.getElementById('submitTrace').style.display = 'block';
					document.getElementById('facility').style.display = 'block';
					var size = document.getElementById('facilitySize').value;
					if (parseInt(size) > 1){
						document.getElementById('dualTraceSubmit').innerHTML = '5';
					} else {
						document.getElementById('dualTraceSubmit').innerHTML = '4';
					}
					if(document.getElementById('footer2')!=null){
					   document.getElementById('footer2').className = 'foot4';
					}else{
						document.getElementById('footer1').className = 'foot3';
					}
				}
	        } else if(document.DentalActionCommonForm.values.value == "no") {
	        	document.getElementById('searchByDIV').style.display = 'none';
	        	document.getElementById('SSNSerialNumber').innerHTML = '2';
	        	document.getElementById('ssn').style.display = 'block';
        		document.getElementById('trace').style.display = 'none';
        		document.getElementById('submitSSN').style.display = 'block';
				document.getElementById('submitTrace').style.display = 'none';
				document.getElementById('dualSSNSubmit').innerHTML = '3';
				document.getElementById('facility').style.display = 'none';
				if(document.getElementById('footer2')!=null){
					document.getElementById('footer2').className = 'foot4';
				}else{
					document.getElementById('footer1').className = 'foot2';
				}
				
	        }
		}
	
	 // Added for EFT 15.3 Release - Starts
		function getXMLHttpRequestObject()
		{
		 var ajaxRequest;
		 try {
		    if (window.XMLHttpRequest) {
		        ajaxRequest = new XMLHttpRequest();
		    } else if(window.ActiveXObject){
		        ajaxRequest = new ActiveXObject("Microsoft.XMLHTTP");
		     	if(ajaxRequest==null || typeof (ajaxRequest)== "undefined" ){
		        ajaxRequest = new ActiveXObject("Msxml2.XMLHTTP");
		    }
		  }
		 }catch (e){
		        return false;//Browser do not support AJAX!
		   }
		  if(!ajaxRequest && typeof XMLHttpRequest != 'undefined') {
		    try {
		    	ajaxRequest = new XMLHttpRequest();
		    } catch (e) {
		    	ajaxRequest = false;
		    }
		  }
		  return ajaxRequest;
		}	
		
		
		function linkClickeMetricsCall(linkVal,fromPage){
			
			var http = new getXMLHttpRequestObject();
			var url = "/prov/MetricsServlet";
			
			var params="linkClicked="+encodeURIComponent(linkVal)+"&thisPage="+encodeURIComponent(fromPage);
			
		    try {
		      http.open("POST", url, true);
		    } catch(e) {
		     	//Error Connectiog with Server
		     	return false;
		    }
		    
			http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			http.onreadystatechange = function() { //Handler function for call back on state change.
		    if(http.readyState == 4) {
		      //Successful
		      return true;
		    }
		  };
			http.send(params);
		}	
	
	// Added for EFT 15.3 Release - Ends
	
	function logeMetricsLinkClick(link) {
		var thisPage = "";
		if (link == "SignUp_EFT" || link == "SignUp_Later") {
			thisPage = "OverlayPage";
		}
		if (thisPage == "" && document.DentalActionCommonForm
				&& document.DentalActionCommonForm.thisPage) {
			thisPage = document.DentalActionCommonForm.thisPage.value;
		}
		linkClickeMetricsCall(link, thisPage);
	}

	// Method to submit the form to external site by its key value
	function linkOffsiteKeySubmit(fwdName, formName, offsiteKey) {
		frmObj = eval(getDocObj(formName));
	
		if (typeof (frmObj) == "undefined" || frmObj == null) {
			alert("Form Name '" + formName + "' is invalid!");
			return;
		}
	
		if (frmObj.linkClicked != undefined && frmObj.linkClicked != null
				&& frmObj.linkClicked != "") {
			var linkClicked = frmObj.linkClicked.value
			if (linkClicked != null && linkClicked != ""
					&& linkClicked != undefined) {
				frmObj.linkClicked.value = linkClicked;
			}
		}
		frmObj.action = "Content";
	
		frmObj.method = 'POST';
		frmObj.target = "_self";
		frmObj.fwdName.value = fwdName;
		frmObj.externalLink.value = '';
		frmObj.externalLinkKey.value = offsiteKey;
		frmObj.submit();
	}
  //2022 Added for DPS Phase 2 Release - Starts	
	function linkOffsiteKeySubmitLeavingPostClaimSummary(fwdName, formName, offsiteKey)
    {
   		
		frmObj = eval(getDocObj(formName));
		
		if (typeof (frmObj) == "undefined" || frmObj == null) {
			alert("Form Name '" + formName + "' is invalid!");
			return;
		}
	
		if (frmObj.linkClicked != undefined && frmObj.linkClicked != null
				&& frmObj.linkClicked != "") {
			var linkClicked = frmObj.linkClicked.value
			if (linkClicked != null && linkClicked != ""
					&& linkClicked != undefined) {
				frmObj.linkClicked.value = linkClicked;
			}
		}
		//frmObj.action = "Content";
	
		frmObj.method = 'POST';
		frmObj.target = "_self";
		frmObj.fwdName.value = fwdName;
		frmObj.externalLink.value = '';
		frmObj.externalLinkKey.value = offsiteKey;
		frmObj.submit();
        
    }
    //2022 Added for DPS Phase 2 Release - Ends	
	// Method to perform form submit on clicking cancel in regExit.jsp - Registration Flow
	function processRegistrationStep(formName, fromPage, currentPage){
		frmObj = eval(getDocObj(formName));
		var scenarioFound = "false";
		if(fromPage == "VerifyNameAddress" && currentPage == "Exit"){
			scenarioFound = "true";
			forwardAction = "/prov/execute/PesRegSignIn";
		} else if(fromPage == "SelectUserID" && currentPage == "Exit"){
			scenarioFound = "true";
			forwardAction = "/prov/execute/PesRegSelUser";
		} else if(fromPage == "Submit" && currentPage == "Exit"){
			scenarioFound = "true";
			forwardAction = "/prov/execute/PesRegSubmit";
		} else if(fromPage == "RegSignIn" && currentPage == "Exit"){
			javascript:linkSubmit4('pesRegSignIn','TopNavForm');
		}
		if(scenarioFound=="true"){
			frmObj.action = forwardAction;
			frmObj.method = 'POST';
			frmObj.target="_top";
			frmObj.submit();	
		} else{
			// do nothing
		}
	}
	
  //2022 Modified for DPS Phase 2 Release	
	// Method to perform back button functionality - Leaving MetLife website flows
	function backButtonFix() {
		if(document.getElementById('thisPage')){
			var thisPage = document.getElementById('thisPage').value;
			   if (thisPage == "ViewClaims") {
			     submitSmForm('TopNavForm', 'entryClaim', 'false', '','false'); 
			   } else if (thisPage == "SubmitClaims") { 
			   	 submitSmForm('TopNavForm', 'entrySubmit', 'false', '','false'); 
			   } else if(thisPage == "ClaimSummary"){
				   linkSubmit4('claimSum', 'TopNavForm');
			   } else if(thisPage == "ClaimSummaryByTrace"){
				   linkSubmit4('claimTrace', 'TopNavForm');
			   }
			   else if (thisPage == "ResourceCenter") { 
			   	 linkSubmit4('rc_index', 'TopNavForm'); 
			   } else { 
			   	 document.forms[0].submit(); 
			   }
		} else{
			linkSubmit4('toHome', 'TopNavForm');
		}
	}

	// Method for displaying informative message related to Download functionality
	function downloadWorkBook(){
		pageScroll();
		var downloadUsedAlready = document.getElementById("downloadClicked").value;
		var fromPage = document.getElementById("thisPage").value;
		var traceFunc;
		if(document.getElementById("searchByTrace")){
			traceFunc = document.getElementById("searchByTrace").value;
		} 
		if(downloadUsedAlready == "true"){
			if(fromPage == "ClaimSummary"){
				submitForm('DentalActionCommonForm','/prov/execute/ExportC','false','','false');
			} else if(fromPage == "PreTreatSummary"){
				submitForm('DentalActionCommonForm','/prov/execute/ExportP','false','','false');
			} else if(fromPage == "ClaimSummaryDHMO"){
				submitForm('DentalActionCommonForm','/prov/execute/ExportClaimSummaryDhmo','false','','false');
			} else if(fromPage == "FacilityRoster"){
				submitForm('DentalActionCommonForm','/prov/execute/ExportFacRoster','false','','false');
			} else if(fromPage == "EOPInquiry"){
				if(traceFunc == "true"){
					submitForm('DentalActionCommonForm','/prov/execute/exportEOPSearchByTrace','false','','false');
				} else{
					submitForm('DentalActionCommonForm','/prov/execute/exportEOPSearch','false','','false');
				}
			} 
		} else{
			document.getElementById("workbook-containerTheme").style.display = "block";
		    document.getElementById("EFT-underlayTheme").style.display = "block";
		}
	}

	function initiateWorkBookDownload(){
		var fromPage = document.getElementById("thisPage").value;
		var traceFunc;
		if(document.getElementById("searchByTrace")){
			traceFunc = document.getElementById("searchByTrace").value;
		} 
		if(fromPage == "ClaimSummary"){
			submitForm('DentalActionCommonForm','/prov/execute/ExportC','false','','false');
			closeOverlay();
			document.getElementById("downloadClicked").value = "true";
		} else if(fromPage == "PreTreatSummary"){
			submitForm('DentalActionCommonForm','/prov/execute/ExportP','false','','false');
			closeOverlay();
			document.getElementById("downloadClicked").value = "true";
		} else if(fromPage == "ClaimSummaryDHMO"){
			submitForm('DentalActionCommonForm','/prov/execute/ExportClaimSummaryDhmo','false','','false');
			closeOverlay();
			document.getElementById("downloadClicked").value = "true";
		} else if(fromPage == "FacilityRoster"){
			submitForm('DentalActionCommonForm','/prov/execute/ExportFacRoster','false','','false');
			closeOverlay();
			document.getElementById("downloadClicked").value = "true";
		} else if(fromPage == "EOPInquiry"){
			if(traceFunc == "true"){
				closeOverlay();
				document.getElementById("downloadClicked").value = "true";
				submitForm('DentalActionCommonForm','/prov/execute/exportEOPSearchByTrace','false','','false');
			} else{
				closeOverlay();
				document.getElementById("downloadClicked").value = "true";
				submitForm('DentalActionCommonForm','/prov/execute/exportEOPSearch','false','','false');
			}
		}
	}

	function closeOverlay(){
		document.getElementById("workbook-containerTheme").style.display = "none";
		document.getElementById("EFT-underlayTheme").style.display = "none";
	}

	function pageScroll() {
    	document.body.scrollTop = 0;
    	document.documentElement.scrollTop = 0;
	}
	
	function openPopup(){
		const popup = document.getElementById("popupBox");
		popup.classList.remove('hidden');
	}

	function closePopupBox(){
		const popup = document.getElementById("popupBox");
		popup.classList.add('hidden');
	}
	
	// CIAM changes for banner starts
	function openBanner(misLoginUrl, startDate, endDate) {
		if(checkBannerCloseDate(startDate, endDate)){
			document.getElementById("CIAMBanner").style.display = "block";
		}
		else{
			if(misLoginUrl!=""){
				location.href=misLoginUrl;
			}
		}
	}
	
		
	function signInRedirection(misLoginUrl) {
	  document.getElementById("CIAMBanner").style.display = "none";
	  if(misLoginUrl!=""){
		  location.href=misLoginUrl;
	  }
	}
	
	function checkBannerCloseDate(startDate, endDate) {
		// Format - MM/DD/YYYY
        
        // Todays date
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();

        // Add Zero if it number is between 0-9
        if(dd<10) {
            dd = '0'+dd;
        }
        if(mm<10) {
            mm = '0'+mm;
        }

        var today = mm + '/' + dd + '/' + yyyy;
        
        var D1 = new Date(startDate);
        var D2 = new Date(endDate);
        var D3 = new Date(today);
         
        if (D3.getTime() <= D2.getTime()
            && D3.getTime() >= D1.getTime()) {
            return true;
        } else {
            return false;
        }
    }
	// CIAM changes for banner ends
	function redirectForgetMISReq(redirURL) {
		if(redirURL != ""){
			const encodedURL = encodeMISTargetURL(redirURL);
			document.location.href = encodedURL;
		}                                                                                                                                                                  
   };
  
   function redirectChangePasswordMISReq(redirectchangePasswordUrl) {
	if(redirectchangePasswordUrl != ""){
		const encodedURL = encodeMISTargetURL(redirectchangePasswordUrl);
		document.location.href = encodedURL;
	}
    };

	function encodeMISTargetURL(url){
		const urlRegex = /(?<prefix>.*TARGET=-SM-)(?<targetURL>.*)/;
		let encodedUrl = url;
		if(urlRegex.test(url)){
			encodedUrl = urlRegex.exec(url).groups.prefix
			.concat(encodeURIComponent(urlRegex.exec(url).groups.targetURL));
		}
		return encodedUrl;
	}
    
	function redirectPINGReq(redirectchangePasswordUrl) {
		if (redirectchangePasswordUrl != "") {
			const encodedURL = encodePINGTargetURL(redirectchangePasswordUrl);
			document.location.href = encodedURL;
		}
	};
	function encodePINGTargetURL(url) {
		const urlRegex = /(?<prefix>.*AdapterId=(HTMLFormPDAdapterUSMDWeb|HTMLFormPDAdapterUSWeb)&call_back_url=)(?<targetURL>.*)/;
		let encodedUrl = url;
		if (urlRegex.test(url)) {
			encodedUrl = urlRegex.exec(url).groups.prefix
				.concat(encodeURIComponent(urlRegex.exec(url).groups.targetURL));
		}
		return encodedUrl;
	};
	
	function redirectloginUrl(url, pingenabled){
		if(pingenabled == "YES"){
			document.location.href=  url;
		}else{
			javascript:linkSubmit4('pesEntry', 'TopNavForm');
		}
	};
	
	function redirectUpdatePasswordLogic(pingurl, misurl, pingenabled){
		if(pingenabled == "YES"){
			redirectPINGReq(pingurl);
		}else{
			redirectChangePasswordMISReq(misurl);
		}
	};
