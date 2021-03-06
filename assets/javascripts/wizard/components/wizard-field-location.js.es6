import { on } from 'ember-addons/ember-computed-decorators';
import { ajax } from 'wizard/lib/ajax';

export default Ember.Component.extend({
  inputFields: ['city', 'countrycode'],
  includeGeoLocation: true,
  layoutName: 'javascripts/wizard/templates/components/wizard-field-location',
  context: Ember.computed.alias('wizard.id'),

  @on('init')
  setup() {
    const existing = this.get('field.value') || {};
    const inputFields = this.get('inputFields');

    inputFields.forEach((f) => {
      if (existing[f]) this.set(f, existing[f]);
      Ember.addObserver(this, f, this, () => {
        this.handleValidation();
      });
    });

    if (existing['geo_location']) this.set('geoLocation', existing['geo_location']);
    Ember.addObserver(this, 'geoLocation', this, () => {
      this.handleValidation();
    });

    Ember.run.later(this, () => this.handleValidation());

    this.set('field.customValidation', true);
  },

  handleValidation() {
    const inputFields = this.get('inputFields');
    const includeGeoLocation = this.get('includeGeoLocation');
    let location = {};

    if (inputFields) {
      let validationType = null;
      inputFields.some((field) => {
        const input = this.get(field);
        if (!input || input.length < 2) {
          validationType = field;
          return true;
        } else {
          location[field] = input;
        };
      });
      if (validationType) return this.setValidation(false, validationType);
    }

    if (includeGeoLocation) {
      const geoLocation = this.get('geoLocation');
      if (!geoLocation) return this.setValidation(false, 'geo_location');
      if (geoLocation) this.validateGeoLocation(geoLocation, location);
    } else {
      this.set("field.value", location);
      this.setValidation(true);
    }
  },

  setValidation(valid, type) {
    const field = this.get('field');
    const message = type ? I18n.t(`location.validation.${type}`) : '';
    field.setValid(valid, message);
  },

  validateGeoLocation(geoLocation, location) {
    ajax({
      url: '/location/validate',
      type: 'GET',
      data: {
        geo_location: geoLocation,
        context: this.get('context')
      }
    }).then((result) => {
      const field = this.get('field');
      if (result.messages.length > 0) {
        field.setValid(false, result.messages[0]);
      } else {
        location['geo_location'] = result.geo_location;
        this.set("field.value", location);
        field.setValid(true);
      }
    });
  }
});
