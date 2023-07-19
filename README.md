# [Deprecated] Facebook Offline Conversion Tag for Google Tag Manager Server Container

Tag is deprecated because Meta deprecated Offline Conversions API. [More information](https://developers.facebook.com/docs/marketing-api/offline-conversions/).

Please use the [new method of tracking offline conversions](https://stape.io/blog/facebook-offline-conversion-using-server-gtm#how-to-set-up-facebook-offline-conversions-using-s-gtm). 

Facebook offline conversion tag for server Google Tag Manager container allows sending events to Facebook offline conversions.

- `Event Name Setup Method` - choose a standard event name, custom event name, or automatically generate an event name using inherit option.
- `API Access Token` - generate API access token in FB business manager.
- `Offline Event Set ID` - create FB offline event set.
- `Upload Tag` - Track your event uploads. Example: monthly, in-store uploads. This field is required.
- `Namespace id` - Scope used to resolve extern_id or tpid. It can be another data set or data partner ID. Example: 12345. Optional field.
- `Server Event Data Override` - use to send parameters: event time, currency, value, content type, contents, order id, and item number.
- `User Data` - use to send parameters:: email, phone, gender, date of birth, first/last name.
- `Custom Data` - add custom data.
- `Logs Settings` - determine if you want to use stape logs.

### To set up FB offline conversion tag, you will need:

1. FB app
2. FB offline event set
3. Facebook system user


## How to use Facebook offline conversion tag

- [Facebook offline conversion using server GTM](https://stape.io/blog/facebook-offline-conversion-using-server-gtm)

## Open Source

Facebook Offline Conversion Tag for GTM Server Side is developing and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
