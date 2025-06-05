import { promises as fs } from 'fs';
import translate from '@vitalets/google-translate-api';

async function translator(text, lang) {
	var translated;

	try {
		translated = await translate(text, {to: lang});
		if (!translated || translated === undefined)
			return -1;
		return translated;
	} catch (err) {
		//console.log(err);
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

async function find_translation(to_find, lang, override) {
	var data;
	if (override == undefined) {
		data = await fs.readFile("./translations.json", 'utf8');
		data = JSON.parse(data);
	} else {
		data = override;
	}
	const response = data[to_find];
	return response?.content[lang];
}

function find_key_by_value(obj, value, lang = "en") {
    for (const key in obj) {
        if (
            obj[key].content &&
            obj[key].content[lang] === value
        ) {
            return key;
        }
    }
    return null;
}

function get_translated_keys(translations, lang) {
    const result = {};
    for (const key in translations) {
		const value = translations[key]?.content?.[lang];
        if (value) {
			result[value] = translations[key];
        }
    }
    return result;
}

async function cycle_translations(text, lang, origin) {
	const data = await fs.readFile("./translations.json", 'utf8');
	const json_data = await JSON.parse(data);
	const json_keys = Object.keys(json_data);
	if (origin == undefined) {
		for (var index = 0; index < json_keys.length; index++) {
			const word = json_keys[index];
			const translation = await find_translation(word, lang, json_data);
			const regex = new RegExp(`\\b${word}\\b`, 'gu');
			text = text.replaceAll(regex, translation);
		}
		return text;
	}
	const translated_keys = get_translated_keys(json_data, origin.userid);
	const json_keys2 = Object.keys(translated_keys);
	const json_data2 = await JSON.parse(data);
	for (var index = 0; index < json_keys2.length; index++) {
		const key = find_key_by_value(json_data2, json_keys2[index], origin.userid);
		const translation = await find_translation(key, lang, json_data);
		const regex = new RegExp(`\\b${json_keys2[index]}\\b`, 'gu');
		text = text.replace(regex, translation);
	}
	return text;
}


export {
	translator,
	translate_text_from_index,
	translate_text,
	find_translation,
	cycle_translations
}