import * as utils from './utils.js'
import translate from 'translate-google'

async function translator(text, lang) {
	var translated;

	try {
		translated = await translate(text, {to: lang});
		if (!translated || translated === undefined)
			return -1;
		return translated;
	} catch (err) {
		console.log(err);
		return -2;
	}
}

async function translate_html(content, lang) {
	var texts = [];


}

export {
	translator,
	translate_html
}