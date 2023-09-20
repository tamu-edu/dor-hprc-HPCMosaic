// Clean this Code if you have time, refactor these wet variable (Dry it out)

function checkLength (value){
    var x = document.getElementById("need-PI-request");
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        x.style.display = "block";
        bodyFields.style.display = "none";
    } else {
        x.style.display = "none";
        bodyFields.style.display = "block";
        extraFields.style.display = "none";
        currentFields.style.display = "block";
        submitField.style.display = "block";
        justificationField.required = true;
    }
}
function checkGroup (value){
    var x = document.getElementById("groupdirCheckbox");
    var y=document.getElementById("add-group");
    var z=document.getElementById("remove-group");    
    var w = document.getElementById("groupDeletionCheckbox");
    if (value === "new_group") {
        x.style.display = "block";
        y.style.display = "block";
        z.style.display = "none";
        w.style.display="none"
        document.getElementById("existinggroup").style.display="none"
        document.getElementById("dir_name").value=document.getElementById("group-name").value;
       
    }
    if (value === "existing_group") {
        document.getElementById("existinggroup").style.display="block"
        w.style.display="block"
        x.style.display="none"
        y.style.display = "none";
        z.style.display = "none";
        
    }
    else{
        x.style.display="none"
        y.style.display = "none";
        z.style.display = "none";
        w.style.display="none"
    }
}
function toggleTextBox() {
    var check = document.getElementById('groupdirCheck');
    var textBox = document.getElementById('dirNameInput');

    if (check.checked) {
       
        textBox.style.display = 'block';
    } else {
        
        textBox.style.display = 'none';
    }
}
function checkAction() {
    var addMembersCheckbox = document.getElementById('addMembersCheckbox');
    var deleteMembersCheckbox = document.getElementById('deleteMembersCheckbox');
    var addMembersFields = document.getElementById('add-group');
    var deleteMembersFields = document.getElementById('remove-group');

    if (addMembersCheckbox.checked && deleteMembersCheckbox.checked) {
        // Both checkboxes are checked, show both sets of fields
        addMembersFields.style.display = 'block';
        deleteMembersFields.style.display = 'block';
    } else if (addMembersCheckbox.checked) {
        // Only "Add Members" checkbox is checked, show its fields
        addMembersFields.style.display = 'block';
        deleteMembersFields.style.display = 'none';
    } else if (deleteMembersCheckbox.checked) {
        // Only "Delete Members" checkbox is checked, show its fields
        addMembersFields.style.display = 'none';
        deleteMembersFields.style.display = 'block';
    } else {
        // Neither checkbox is checked, hide both sets of fields
        addMembersFields.style.display = 'none';
        deleteMembersFields.style.display = 'none';
    }
}
// function checkDelete (){
    
//      var x = document.getElementById("delgroup");
     
//      if (x.checked == true) {
//         $('#' +"confirmDeleteModal").modal('show'); 
//         $('#'+"requestGroupModal").modal('hide')
//      }
 
// }
function approveDel (){
   
   document.getElementById("delete").value='yes';
  
}
$(document).on('hidden.bs.modal', function () {
    if($('.modal.show').length)
    {
      $('body').addClass('modal-open');
    }
  });
function checkPi (value){
    var PiNotice = document.getElementById("Pi-notice");
    var confirmBuyin = document.getElementById("buyin-option");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var bodyFields = document.getElementById("body-form-fields");
    var submitField = document.getElementById("submit-field");
    if (value === "yes") {
        PiNotice.style.display = "none";
        confirmBuyin.style.display = "block";
    } else {
        PiNotice.style.display = "block";
        confirmBuyin.style.display = "none";
        bodyFields.style.display = "none";
        currentFields.style.display = "none";
        submitField.style.display = "none";
        extraFields.style.display = "none";
    } 
    
}

function checkBuyin(value){
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        bodyFields.style.display = "none";
        extraFields.style.display = "block";
        justificationField.required = false;
        
    } else {
        bodyFields.style.display = "block";
        extraFields.style.display = "block";
        justificationField.required = true;
    }
    submitField.style.display = "block";
    currentFields.style.display = "block";
}

// Quota Request Log File
// function logFile() {
//     var formData = new FormData(document.querySelector('form'));
//     console.log(formData);
// }

// const fs = require('fs');


// modalQuotaRequestForm.onsubmit = async (e) => {
//     e.preventDefault();

//     const log = fs.createWriteStream('log.txt', { flags: 'a' });
//     // let response = await fetch('/article/formdata/post/user', {
//     //   method: 'POST',
//     formData = new FormData(modalQuotaRequestForm);
//     // });

    
    
//     var message = "";
//     for(var pair of formData.entries()) {
//         message += pair[0]+ ', '+ pair[1] + '\t';
//         console.log(message)
//     }
//     message += '\n';
//     console.log(message);
//     log.write(message);

//     log.end();

// };






