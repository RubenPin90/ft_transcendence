import { promises as fs } from 'fs';
import * as utils from './utils.js'
import * as modules from './modules.js'
import * as translator from './translate.js'


function break_html_into_pieces(content) {
    var html_obj = [];
    var html_content = content;
    var check_beginning = html_content.slice(0, html_content.indexOf('\r\n'));
    check_beginning = check_beginning.trim();
    if (check_beginning == '<!DOCTYPE html>' || check_beginning.startsWith("<meta"))
        html_content = html_content.slice(html_content.indexOf('\r\n') + 2);
    
    var origin = {'indent': 0, 'open_tag': '', 'text': html_content, 'closing_tag': ''};
    for (var fail_safe = 0; fail_safe < 999999999; fail_safe++) {
        const returned = utils.DOM_text(origin.text);
        if (returned == null)
            break;
        const pos = html_content.indexOf(returned.closing_tag);
        html_obj.push(returned);
        if (pos == html_content.indexOf(origin.closing_tag) - 2 - origin.closing_tag.length)
            break;
        html_content = html_content.slice(pos + returned.closing_tag.length + 2);
        origin.text = html_content;
    }
    return html_obj;
}

function split_translate_combine(content) {
    var parts = []


    // const parts = break_html_into_pieces(data);
    // // console.log(parts);

    // // const first = break_html_into_pieces2(parts[1].text);
    // const first = break_html_into_pieces(parts[0].text);
    // // console.log(first);
    // // console.log(first);

    // const wow = break_html_into_pieces(first[0].text);
    // // console.log(wow);

    // const kkk = break_html_into_pieces(wow[0].text);
    // console.log(kkk[0]);
}

var data = await fs.readFile(`./templates/home.html`, 'utf-8');
split_translate_combine(data);

// console.log(utils.split_DOM_elemets(html_content));
// console.log(await translator.translator('long sentence.. This is a..', 'de'))