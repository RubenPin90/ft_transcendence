import * as settings_db from './database/db_settings_functions.js';
import * as main_db from './database/db_main.js';
import * as mfa_db from './database/db_mfa_functions.js'
import * as joined_db from './database/db_joined_functions.js'

// await main_db.create_db();
// await settings_db.create_settings_value('aaa', "fsdfhsdhf", 0, 0, 757348957938475, 8348579834759879);
// await settings_db.get_settings();
// await main_db.show_full_db();
// const value = await mfa_db.get_mfa_value('self', '47858745', '47858745');

// let value = await mfa_db.create_mfa_value('', 0, 0, '47858745');
// console.log(value);
// value = await main_db.show_full_db();
// console.log(value);
// value = await mfa_db.delete_mfa_value('47858745');
// console.log(value);
// value = await main_db.show_full_db();
// console.log(value);


let value = await mfa_db.get_mfa_value('self', '47858745');
console.log(value);
value = await mfa_db.update_mfa_value('custom', 555555, '47858745');
console.log(value);
value = await mfa_db.get_mfa_value('self', '47858745');
console.log(value);