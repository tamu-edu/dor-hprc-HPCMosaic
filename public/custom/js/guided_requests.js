function checkFields (value){
    var x = document.getElementById("software-type");
    if (value === "Software Usage") {
        x.style.display = "block";
    } else {
        x.style.display = "none";

    }
    
    var x =document.getElementById("accounts");
    var y =document.getElementById("account-type");
    if(value=="Account related")
    {
        y.style.display="block";
        x.style.display="block";
    }
    else{
        y.style.display="none"
        x.style.display="none";
    }
        
    var x =document.getElementById("slurm");
    var y =document.getElementById("slurm-type");
    if(value=="Running Job")
    {
        y.style.display="block";
        x.style.display="block";
    }
    else{
        y.style.display="none"
        x.style.display="none";
    }
    var x =document.getElementById("training");
    var y =document.getElementById("training-type");
    if(value=="Training")
    {
        y.style.display="block";
        x.style.display="block";
    }
    else{
        y.style.display="none"
        x.style.display="none";
    }
}
function generateCheckboxes(typeId, checkboxData) {
    var typeDiv = document.getElementById(typeId);
    typeDiv.innerHTML = '';

    var typeHeader = document.createElement('p');
    typeHeader.textContent = 'What are you looking for?';
    typeDiv.appendChild(typeHeader);

    checkboxData.forEach(function(item) {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = typeId;
        checkbox.value = item.value;
        checkbox.id = item.value.replace(/\s+/g, '');

        var labelElement = document.createElement('label');
        labelElement.style.fontWeight = 'normal';
        labelElement.htmlFor = checkbox.id;
        labelElement.textContent = item.label;

        typeDiv.appendChild(checkbox);
        typeDiv.appendChild(labelElement);
        typeDiv.appendChild(document.createElement('br'));
    });
}

function checkAccount(value) {
    var checkboxData = [];

    if (value === 'SUs') {
        checkboxData = [
            { label: 'More SUs', value: 'MoreSus' },
            { label: 'Transfer SUs', value: 'TransferSus' }
        ];
    } else if (value === 'Shared Directory') {
        checkboxData = [
            { label: 'Create', value: 'create' },
            { label: 'Check members', value: 'check members' },
            { label: 'Increase quota', value: 'increase quota' },
            { label: 'Add members', value: 'add members' }
        ];
    } else if (value === 'Application') {
        checkboxData = [
            { label: 'Application denied', value: 'Application denied' },
            { label: 'PI doesnot know the user', value: 'PI doesnot know the user' },
            { label: 'Application status ', value: 'Application status ' },
            { label: 'Add members', value: 'add members' }
        ];
    } else if (value === 'Login') {
        checkboxData = [
            { label: 'Account Expired ', value: 'Account Expired ' },
            { label: 'Two Factor Authentication Issue', value: 'Two Factor Authentication Issue' },
            { label: 'Two many failed attempts', value: 'Two many failed attempts' },
            { label: 'VPN related ', value: 'VPN related ' }
        ];
    } else if (value === 'Quota') {
        checkboxData = [
            { label: 'Quota Extension ', value: 'Quota Extension ' },
            { label: 'Quota increase', value: 'Quota increase' },
      
        ];
    }

    generateCheckboxes('accounts', checkboxData);
}
function checkSlurm(value) {
    var checkboxData = [];

    if (value === 'Job Ended') {
        checkboxData = [
            { label: 'Out of Memory', value: 'MoreSus' },
            { label: 'No Error', value: 'TransferSus' },
            { label: 'Not enough time', value: 'Not enough time' },
            { label: 'Account that is being charged for the job', value: 'Account that is being charged for the job' },
        ];
    } else if (value === 'Job Status') {
        checkboxData = [
            { label: 'Commands/Flags to Check', value: 'Commands/Flags to Check' },
        ];
    } else if (value === 'SUs Used') {
        checkboxData = [
            { label: 'How to Calculate', value: 'How to Calculate' },
            { label: 'SUs Used on Previous Job', value: 'SUs Used on Previous Job' },
        ];
    }
    else if (value === 'Wall time extension') {
        checkboxData = [
            { label: 'days', value: 'days' },
        ];
    }

    generateCheckboxes('slurm', checkboxData);
}
function checkTraining(value) {
    var checkboxData = [];

    if (value === 'SCA') {
        checkboxData = [
            { label: 'Application', value: 'Application' },
            { label: 'Program Detail', value: 'Program Detail' },
        ];
    } else if (value === 'Short Course') {
        checkboxData = [
            { label: 'Account Application without PI', value: 'Account Application without PI' },
        ];
    } else if (value === 'Workshops') {
        checkboxData = [
            { label: 'Intel', value: 'Intel' },
            { label: 'Micro Credential Course', value: 'Micro Credential Course' },
        ];
    }

    generateCheckboxes('training', checkboxData);
}