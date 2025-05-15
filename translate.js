import { promises as fs } from 'fs';
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

async function translate_text_from_index(content, index) {
	const language_codes = [
		"af", "sq", "ar", "hy", "az", "eu", "be", "bn", "bs",
		"bg", "ca", "ceb", "zh-cn", "zh-tw", "co", "hr", "cs", "da",
		"nl", "eo", "et", "fi", "fr", "fy", "gl", "ka", "de", "en",
		"el", "gu", "ht", "ha", "haw", "iw", "hi", "hmn", "hu", "is",
		"ig", "id", "ga", "it", "ja", "jw", "kn", "kk", "km",
		"ko", "ku", "ky", "lo", "la", "lv", "lt", "lb", "mk", "mg",
		"ms", "ml", "mt", "mi", "mr", "mn", "my", "ne", "no", "ny",
		"ps", "fa", "pl", "pt", "ro", "ru", "sm", "gd",
		"sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su",
		"sw", "sv", "tl", "tg", "ta", "te", "th", "tr",
		"uk", "ur", "uz", "vi", "cy", "xh", "yi", "yo", "zu"
	];
	if (index >= language_codes.length)
		return null;
	const text = await translator(content, language_codes[index]);
	return {'lang': language_codes[index], text};
}

async function translate_text(content) {
	var available = true;
	const sentences = {
		content: {}
	};
	
	for (var pos = 0; pos < 999999999; pos++) {
		const response = await translate_text_from_index(content, pos);
		if (!response || response === undefined)
			break;
		sentences.content[response.lang] = response.text;
	}
	
	try {
		await fs.open('./translations.json');
	} catch (err) {
		available = false;
	}
	
	var data;
	if (available) {
		data = await fs.readFile('./translations.json', 'utf8');
		data = JSON.parse(data);
		data[content] = sentences;
	} else {
		data = {sentences};
	}
	await fs.writeFile('./translations.json', JSON.stringify(data, null, 2), 'utf8');
}

async function find_translation(to_find, lang) {
	var data = await fs.readFile("./translations.json", 'utf8');
	data = JSON.parse(data);
	const response = data[to_find];
	return response.content[lang];
}


export {
	translator,
	translate_text_from_index,
	translate_text,
	find_translation
}