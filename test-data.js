
setInterval(function () {
    var message = Math.round(Math.random() * 100).toString();
    process.stdout.write(message);
}, 50);

//setTimeout(function () {
//    process.exit();
//}, 5000);
