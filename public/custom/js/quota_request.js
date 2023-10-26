// Clean this Code if you have time, refactor these wet variable (Dry it out)

function checkLength (value){
    var x = document.getElementById("need-PI-request");
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    var justificationField1 = document.getElementById("justification-field1");
    var justificationField2 = document.getElementById("justification-field2");
    var justificationField3 = document.getElementById("justification-field3");
    var justificationField4 = document.getElementById("justification-field4");
    var extensionField = document.getElementById("extension-option");
    if (value === "yes") {
        x.style.display = "block";
        bodyFields.style.display = "none";
    } else {
        x.style.display = "none";
        bodyFields.style.display = "block";
        extraFields.style.display = "none";
        currentFields.style.display = "block";
        submitField.style.display = "block";
        extensionField.style.display="block";
        justificationField.required = true;
        justificationField1.required = true;
        justificationField2.required = true;
        justificationField3.required = true;
        justificationField4.required = true;

    }
}
function checkGroup (value){
    var x = document.getElementById("groupdirCheckbox");
    var y=document.getElementById("add-group");
    var z=document.getElementById("remove-group");    
    var w = document.getElementById("groupDeletionCheckbox");
    document.getElementById('comments').style.display="block"
    if (value === "True") {
       
        x.style.display = "block";
        y.style.display = "block";
        z.style.display = "none";
        w.style.display="none"
        document.getElementById("existinggroup").style.display="none"
        var actionDropdown = document.getElementById('actionDropdown');
        actionDropdown.selectedIndex = 1;
        
        document.getElementById('actionField').value=" "
       
        document.getElementById("dir_name").value=document.getElementById("group-name").value;

    }
    if (value === "False") {
        document.getElementById("existinggroup").style.display="block"
        var actionDropdown = document.getElementById('actionDropdown');
        actionDropdown.selectedIndex = 0;
        w.style.display="block"
        x.style.display="none"
        y.style.display = "none";
        z.style.display = "none";
        document.getElementById('NewgroupUsers').value=" "
        document.getElementById('dirNameInput').value=" "
        document.getElementById('groupdirCheck').checked = false;
        
    }
    else{
        x.style.display="none"
        y.style.display = "none";
        z.style.display = "none";
        w.style.display="none";
    }
}
function updateTargetUsers() {

    var newGroupUsers = document.getElementById("NewgroupUsers").value;
     document.getElementById("actionField").value=newGroupUsers
     
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
        var actionDropdown = document.getElementById('actionDropdown');
        var inputField = document.getElementById('inputField');
        var selectedOption = actionDropdown.options[actionDropdown.selectedIndex].value;
        // document.getElementById('actionDropdown').name=selectedOption
       
        
        
        // Determine the placeholder text based on the selected option
        var placeholderText = "";
        if (selectedOption === 'addMembers') {
            placeholderText = 'Add Members';
        } else if (selectedOption === 'deleteMembers') {
            placeholderText = 'Delete Members';
        } else if (selectedOption === 'addDelegate') {
            placeholderText = 'Add Delegate';
        } else if (selectedOption === 'removeDelegate') {
            placeholderText = 'Remove Delegate';
        }
        

        // Set the placeholder text and display the input field
        inputField.querySelector('input').setAttribute('placeholder', placeholderText);
        inputField.style.display = 'block';
    
}
function checkDelete() {
    var x = document.getElementById("delgroup");
    var actionDropdown = document.getElementById('actionDropdown');
    var current_val = actionDropdown.value;

    if (x.checked == true) {
        // Add an option with the value "deleteGroup"
        var newOption = document.createElement('option');
        newOption.value = "deleteGroup";
        newOption.text = "Delete Group";
        actionDropdown.add(newOption);

        // Change the selected option to "deleteGroup"
        actionDropdown.value = "deleteGroup";
    } else {
        // Remove the dynamically added option
        actionDropdown.remove(actionDropdown.selectedIndex);

        // Restore the original value
        actionDropdown.value = current_val;
    }
}

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
    var justificationField1 = document.getElementById("justification-field1");
    var justificationField2 = document.getElementById("justification-field2");
    var justificationField3 = document.getElementById("justification-field3");
    var justificationField4 = document.getElementById("justification-field4");
    if (value === "yes") {
        bodyFields.style.display = "none";
        extraFields.style.display = "block";
        justificationField.required = false;
        justificationField1.required = false;
        justificationField2.required = false;
        justificationField3.required = false;
        justificationField4.required = false;
        
    } else {
        bodyFields.style.display = "block";
        extraFields.style.display = "block";
        justificationField.required = true;
        justificationField1.required = true;
        justificationField2.required = true;
        justificationField3.required = true;
        justificationField4.required = true;
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






