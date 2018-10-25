const got = require('got');

async function geocode (address) {
  const { HERE_APP_ID, HERE_APP_CODE } = process.env;
  try {
    const response = await got('https://geocoder.api.here.com/6.2/geocode.json', {
      query: {
        app_id: HERE_APP_ID,
        app_code: HERE_APP_CODE,
        searchtext: address,
        jsonattributes: 1
      }
    });
    const { latitude, longitude } = JSON.parse(response.body).response.view[0].result[0].location.displayPosition;
    return { lat: latitude, lng: longitude };
  } catch (error) {
    console.log(error.response.body);
  }
}

module.exports = geocode;
