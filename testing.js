import { promises as fs } from 'fs';
import * as utils from './utils.js'

// var html_content = await fs.readFile(`./templates/home.html`, 'utf-8');
// var returned = [];
// // for (var i = 0; i < html_content.length; i++) {
    //     const pos = html_content.indexOf('\r\n');
    //     const row = html_content.slice(0, pos);
    //     console.log(row)
    //     returned = utils.split_DOM_elemets(row);
    //     html_content = html_content.slice(0, pos + 1)
    //     // i = pos;
    // // }
    // // var returned = utils.split_DOM_elemets('<div id="Cars"><div id="Models"><div><h1>hi</h1></div></div></div>');
    
var html_content = await fs.readFile(`./templates/home.html`, 'utf-8');
const returned = utils.DOM_text(html_content);

console.log(returned);

