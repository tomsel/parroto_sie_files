require('es6-shim');
var moment = require('moment');
var assert = require('assert');
var sie = require('sie-reader');

assert.ok(sie, 'Failed to require SIE');
const DATE_FORMAT = 'YYYYMMDD';

function iterate(value, key) {
  console.log(moment(key).format(DATE_FORMAT) + ' ' + value);
}
var test_file = process.argv[2];
sie.readFile('./testfiles/' + test_file, function(err, data){
	assert.ifError(err);

  var  bookkeeping_account_from_user_input = [];
  for (var i = 3; i < process.argv.length; i++) {
    bookkeeping_account_from_user_input.push(process.argv[i]);
  }

  // automatic fetch start date of the SIE file.
  var taxList = data.list('rar')
  var startDate;
  var endDate;
  for (var i = 0; i < taxList.length; i++) {
    if (taxList[i].årsnr == 0) {
      startDate = taxList[i].start;
      endDate = taxList[i].slut;
    }
  }

  /*
   * Collecting all user account into one summarized account
   */
  var account_from_bookkeeping = data.list('ib');
  var map_of_date_and_account = new Map();
  var balance_account = 0;

  for (var i = 0; i < account_from_bookkeeping.length; i++) {
    for (var j = 0; j < bookkeeping_account_from_user_input.length; j=j+2) {
      var account_number = parseInt(account_from_bookkeeping[i].konto);
      if (account_number >= parseInt(bookkeeping_account_from_user_input[j]) &&
          account_number <= parseInt(bookkeeping_account_from_user_input[j+1]) &&
          account_from_bookkeeping[i].årsnr == 0) {
          balance_account += parseInt(account_from_bookkeeping[i].saldo);
      }
    }
  }

  /*
   * find all verifications and add that into map_of_date_and_account
   */
   var all_verifications = data.list('ver');
   all_verifications.sort(function(a, b){
      if (a.verdatum > b.verdatum) {
        return 1;
      } else if (a.verdatum < b.verdatum) {
        return -1;
      }
      return 0;
   });

   for (var i = 0; i < all_verifications.length; i++ ) {
     for (var j = 0; j < all_verifications[i].poster.length; j++) {
       for (var k = 0; k < bookkeeping_account_from_user_input.length; k=k+2) {
         var account_number = parseInt(all_verifications[i].poster[j].kontonr);
         if (account_number >= parseInt(bookkeeping_account_from_user_input[k]) && account_number <= parseInt(bookkeeping_account_from_user_input[k+1])) {
           balance_account = (balance_account + (parseInt(all_verifications[i].poster[j].belopp)));
           map_of_date_and_account.set(all_verifications[i].verdatum, balance_account);
         }
       }
     }
   }
  var balance_tmp = 0;
  for (var i = moment(startDate); i.isBefore(endDate); i.add(1, 'days')) {
    if (map_of_date_and_account.has(i.format(DATE_FORMAT))){
      balance_tmp = map_of_date_and_account.get(i.format(DATE_FORMAT));
    } else {
      map_of_date_and_account.set(i.format(DATE_FORMAT), balance_tmp);
    }
  }
  process.stdout.write('Cash summary of file ' + test_file + ' of following bookkeeping accounts ')

  for (var i = 0; i < bookkeeping_account_from_user_input.length; i = i+2) {
      process.stdout.write(bookkeeping_account_from_user_input[i] + ' - ' + bookkeeping_account_from_user_input[i+1] + ' and ' );
  }
  console.log();
  console.log();
  for (var i = moment(startDate); i.isBefore(endDate); i.add(1, 'days')) {
    console.log(i.format(DATE_FORMAT) + ' ' + map_of_date_and_account.get(i.format(DATE_FORMAT)));
  }
});
