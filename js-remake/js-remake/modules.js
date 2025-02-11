async function get_cookies(request) {
	const values = request?.split('; ');
	if (!values)
		return [null, null]
	let key = [];
	let value = [];
	values?.forEach(element => {
		const [i_key, i_value] = element.split('=');
		key.push(i_key);
		value.push(i_value);
	});
	return [key, value];
}

async function search_array(array, value) {

}

module.exports = {
	get_cookies,
	search_array
}