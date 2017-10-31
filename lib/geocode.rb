# frozen_string_literal: true

class GeocoderError < StandardError; end

class Locations::Geocode
  def self.set_provider(provider)
    provider = provider.to_sym
    api_key = SiteSetting.location_geocoding_api_key
    timeout = SiteSetting.location_geocoding_timeout

    Geocoder.configure(
      lookup: provider,
      api_key: api_key,
      timeout: timeout,
      cache: $redis,
      cache_prefix: 'geocode',
      always_raise: :all,
      use_https: true
    )

    ## test to see that the provider requirements are met
    perform('10 Downing Street')
  end

  def self.search(user, request)
    query = request['query']
    countrycode = request['countrycode']
    context = request['context']
    options = { language: user.effective_locale }

    custom_options.each do |block|
      if updated_options = block.call(options, context)
        options = updated_options
      end
    end

    provider = options[:lookup] || Geocoder.config[:lookup]

    if countrycode
      country_key = nil

      # note: Mapquest does not support country code request resrictions
      case provider
      when :nominatim, :location_iq, :yandex
        country_key = 'countrycodes'
      when :mapzen
        country_key = 'boundary.country'
      when :mapbox
        country_key = 'country'
      when :opencagedata
        country_key = 'countrycode'
      end

      options[:params] = { country_key.to_sym => countrycode } if country_key
    end

    locations = perform(query, options)

    filters.each do |filter|
      if filtered_locations = filter[:block].call(locations, context)
        locations = filtered_locations
      end
    end

    { locations: locations, provider: provider }
  end

  def self.perform(query, options = {})
    begin
      Geocoder.search(query, options)
    rescue SocketError
      raise GeocoderError.new I18n.t('location.errors.socket')
    rescue Timeout::Error
      raise GeocoderError.new I18n.t('location.errors.timeout')
    rescue Geocoder::OverQueryLimitError
      raise GeocoderError.new I18n.t('location.errors.query_limit')
    rescue Geocoder::RequestDenied
      raise GeocoderError.new I18n.t('location.errors.request_denied')
    rescue Geocoder::InvalidRequest
      raise GeocoderError.new I18n.t('location.errors.request_invalid')
    rescue Geocoder::InvalidApiKey
      raise GeocoderError.new I18n.t('location.errors.api_key')
    rescue Geocoder::ServiceUnavailable
      raise GeocoderError.new I18n.t('location.errors.service_unavailable')
    end
  end

  def self.sorted_validators
    @sorted_validators ||= []
  end

  def self.validators
    sorted_validators.map { |h| { block: h[:block] } }
  end

  def self.add_validator(priority = 0, &block)
    sorted_validators << { priority: priority, block: block }
    @sorted_validators.sort_by! { |h| -h[:priority] }
  end

  def self.sorted_filters
    @sorted_filters ||= []
  end

  def self.filters
    sorted_filters.map { |h| { block: h[:block] } }
  end

  def self.add_filter(priority = 0, &block)
    sorted_filters << { priority: priority, block: block }
    @sorted_filters.sort_by! { |h| -h[:priority] }
  end

  def self.custom_options
    @custom_options ||= []
  end

  def self.add_options(&block)
    custom_options << block
  end
end
