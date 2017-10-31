import { ajax } from './ajax';

function locationSearch(request, resultsFn) {
  ajax({
    url: '/location/search',
    data: { request }
  }).then(function (r) {
    resultsFn(r);
  }).catch(function (e) {
    let message = I18n.t('location.errors.search');

    if (e.jqXHR && e.jqXHR.responseText) {
      const responseText = e.jqXHR.responseText;
      message = responseText.substring(responseText.indexOf('>') + 1, responseText.indexOf('plugins'));
    };

    resultsFn({ error: true, message });
  });
}

var debouncedLocationSearch = _.debounce(locationSearch, 400);

let geoLocationSearch = (request) => {
  if (!request) return;

  return new Ember.RSVP.Promise(function(resolve, reject) {
    debouncedLocationSearch(request, function(r) {
      if (r.error) {
        reject(r.message);
      } else {
        resolve(r);
      };
    });
  });
};

let geoLocationFormat = function(geoLocation, params = {}) {
  if (!geoLocation) return;
  let display = '';

  if (params['displayAttrs'] && params['displayAttrs'].length > 0) {
    params['displayAttrs'].forEach(function(a) {
      if (geoLocation[a]) {
        if (display.length > 0) {
          display += ', ';
        }
        display += geoLocation[a];
      }
    });
  } else {
    display = geoLocation.address;
  }

  return display;
};

let locationFormat = function(location, opts = {}) {
  if (!location) return '';

  let display = '';

  if (location.name) {
    display += location.name;
  };

  if (opts['attrs']) {
    opts['attrs'].forEach(function(p) {
      if (location[p]) {
        if (display.length > 0 || location.name) {
          display += ', ';
        }

        display += location[p];
      }
    });
  } else if (location.geo_location) {
    if (location.name) display += ', ';
    display += geoLocationFormat(location.geo_location);
  } else if (location.raw) {
    if (location.name) display += ', ';
    display += location.raw;
  }

  return display;
};

let providerDetails = {
  nominatim: `<a href='https://www.openstreetmap.org' target='_blank'>OpenStreetMap</a>`,
  mapzen: `<a href='https://mapzen.com/' target='_blank'>Mapzen</a>`,
  location_iq: `<a href='https://locationiq.org/' target='_blank'>LocationIQ</a>`,
  opencagedata: `<a href='https://opencagedata.com' target='_blank'>OpenCage Data</a>`,
  mapbox: `<a href='https://www.mapbox.com/' target='_blank'>Mapbox</a>`,
  mapquest: `<a href='https://developer.mapquest.com' target='_blank'>Mapquest</a>`,
  yandex: `<a href='https://tech.yandex.ru/maps/geocoder/' target='_blank'>yandex</a>`
};

export { geoLocationSearch, geoLocationFormat, locationFormat, providerDetails };
