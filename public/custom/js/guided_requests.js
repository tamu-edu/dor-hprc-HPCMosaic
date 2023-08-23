function checkFields (value){

    var x = document.getElementById("software-type");
    if (value === "Software Usage") {
        x.style.display = "block";
    } else {
        x.style.display = "none";

    }
}