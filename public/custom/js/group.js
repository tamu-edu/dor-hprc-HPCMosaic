function setup_request_sender(request_endpoint, form_id, modal_id,confirm_model_id,confirm_delete_form) {
    // Source: https://developer.mozilla.org/en-US/docs/Learn/Forms/Sending_forms_through_JavaScript
    window.addEventListener("load", function () {
        function sendData() {
            const XHR = new XMLHttpRequest();

            // Bind the FormData object and the form element
            const FD = new FormData(form);
          
            // Define what happens on successful data submission
            XHR.addEventListener("load", function (event) {
                alert(event.target.responseText);
            });

            // Define what happens in case of error
            XHR.addEventListener("error", function (event) {
                alert(`Oops! ${event.target.responseText}`);
            });

            // Set up our request
            XHR.open("POST", request_endpoint);

            // The data sent is what the user provided in the form
            XHR.send(FD);
        }

        // Access the form element...
        let form = document.getElementById(form_id);
        if (form == null) {
            return;
        }

        // ...and take over its submit event.
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var x = document.getElementById("delgroup");
     
            if (x.checked == true) {
                if(document.getElementById("delete").value!='yes'){
               
               $('#' +"confirmDeleteModal").modal('show'); 
               $('#'+"requestGroupModal").modal('hide')
                }
               if(document.getElementById("delete").value=='yes'){
                
                sendData();
                $(modal_id).modal('hide');
               }

            }
            else{
            sendData();
            $(modal_id).modal('hide');
            }
        });
    });
}



(() => {
    GROUP_REQUEST_ENDPOINT = document.dashboard_url + "/request/group";
    HELP_REQUEST_ENDPOINT = document.dashboard_url + "/request/help";
    GUIDED_HELP_REQUEST_ENDPOINT = document.dashboard_url + "/request/guidedhelp";
    
    setup_request_sender(GROUP_REQUEST_ENDPOINT, "modalGroupRequestForm", "#requestGroupModal","#confirmDeleteModal","confirmdeleteform");
    
    setup_request_sender(HELP_REQUEST_ENDPOINT, "modalHelpRequestForm", "#requestHelpModal");
    setup_request_sender(GUIDED_HELP_REQUEST_ENDPOINT, "modalGuidedHelpRequestForm", "#requestGuidedHelpModal");

})()