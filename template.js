const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const JSON = require('JSON');
const Math = require('Math');
const sendHttpRequest = require('sendHttpRequest');
const getTimestampMillis = require('getTimestampMillis');
const getContainerVersion = require('getContainerVersion');
const logToConsole = require('logToConsole');
const sha256Sync = require('sha256Sync');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const makeString = require('makeString');

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = isLoggingEnabled ? getRequestHeader('trace-id') : undefined;

const eventData = getAllEventData();

const apiVersion = '14.0';
const postUrl = 'https://graph.facebook.com/v' + apiVersion + '/' + enc(data.offlineEventSetId) + '/events?access_token=' + enc(data.accessToken);
const mappedEventData = mapEvent(eventData, data);
const postBody = {data: [mappedEventData], upload_tag: data.uploadTag};

if (isLoggingEnabled) {
    logToConsole(JSON.stringify({
        'Name': 'Facebook Offline Conversion',
        'Type': 'Request',
        'TraceId': traceId,
        'EventName': mappedEventData.event_name,
        'RequestMethod': 'POST',
        'RequestUrl': postUrl,
        'RequestBody': postBody,
    }));
}

sendHttpRequest(postUrl, (statusCode, headers, body) => {
    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Facebook Offline Conversion',
            'Type': 'Response',
            'TraceId': traceId,
            'EventName': mappedEventData.event_name,
            'ResponseStatusCode': statusCode,
            'ResponseHeaders': headers,
            'ResponseBody': body,
        }));
    }

    if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
    } else {
        data.gtmOnFailure();
    }
}, {headers: {'content-type': 'application/json'}, method: 'POST'}, JSON.stringify(postBody));


function getEventName(data) {
    if (data.eventType === 'inherit') {
        let eventName = eventData.event_name;

        let gaToFacebookEventName = {
            'page_view': 'PageView',
            "gtm.dom": "PageView",
            'add_payment_info': 'AddPaymentInfo',
            'add_to_cart': 'AddToCart',
            'add_to_wishlist': 'AddToWishlist',
            'sign_up': 'CompleteRegistration',
            'begin_checkout': 'InitiateCheckout',
            'generate_lead': 'Lead',
            'purchase': 'Purchase',
            'search': 'Search',
            'view_item': 'ViewContent',

            'contact': 'Contact',
            'customize_product': 'CustomizeProduct',
            'donate': 'Donate',
            'find_location': 'FindLocation',
            'schedule': 'Schedule',
            'start_trial': 'StartTrial',
            'submit_application': 'SubmitApplication',
            'subscribe': 'Subscribe',

            'gtm4wp.addProductToCartEEC': 'AddToCart',
            'gtm4wp.productClickEEC': 'ViewContent',
            'gtm4wp.checkoutOptionEEC': 'InitiateCheckout',
            'gtm4wp.checkoutStepEEC': 'AddPaymentInfo',
            'gtm4wp.orderCompletedEEC': 'Purchase'
        };

        if (!gaToFacebookEventName[eventName]) {
            return eventName;
        }

        return gaToFacebookEventName[eventName];
    }

    return data.eventType === 'standard' ? data.eventNameStandard : data.eventNameCustom;
}

function mapEvent(eventData, data) {
    let eventName = getEventName(data);

    let mappedData = {
        event_name: eventName,
        event_time: Math.round(getTimestampMillis() / 1000),
        custom_data: {},
        match_keys: {}
    };

    mappedData = addUserData(eventData, mappedData);
    mappedData = addEcommerceData(eventData, mappedData);
    mappedData = overrideDataIfNeeded(data, mappedData);
    mappedData = cleanupData(mappedData);
    mappedData = hashDataIfNeeded(mappedData);

    return mappedData;
}

function enc(data) {
    data = data || '';
    return encodeUriComponent(data);
}

function isHashed(value) {
    if (!value) {
        return false;
    }

    return makeString(value).match('^[A-Fa-f0-9]{64}$') !== null;
}

function hashData(key, value) {
    if (!value) {
        return value;
    }

    const type = getType(value);

    if (type === 'undefined' || value === 'undefined') {
        return undefined;
    }

    if (type === 'object') {
        return value.map(val => {
            return hashData(key, val);
        });
    }

    if (isHashed(value)) {
        return value;
    }

    value = makeString(value).trim().toLowerCase();

    if (key === 'phone') {
        value = value.split(' ').join('').split('-').join('').split('(').join('').split(')').join('').split('+').join('');
    } else if (key === 'ct') {
        value = value.split(' ').join('');
    }

    return sha256Sync(value, {outputEncoding: 'hex'});
}

function hashDataIfNeeded(mappedData) {
    if (mappedData.match_keys) {
        for (let key in mappedData.match_keys) {
            if (key === 'email' || key === 'phone' || key === 'gen' || key === 'doby' || key === 'dobm' || key === 'dobd' || key === 'ln' || key === 'fn' || key === 'fi' || key === 'ct' || key === 'st' || key === 'zip' || key === 'country' || key === 'madid') {
                mappedData.match_keys[key] = hashData(key, mappedData.match_keys[key]);
            }
        }
    }

    return mappedData;
}

function overrideDataIfNeeded(data, mappedData) {
    if (data.serverEventDataList) {
        data.serverEventDataList.forEach(d => {
            mappedData[d.name] = d.value;
        });
    }

    if (data.userDataList) {
        data.userDataList.forEach(d => {
            mappedData.match_keys[d.name] = d.value;
        });
    }

    if (data.customDataList) {
        data.customDataList.forEach(d => {
            mappedData.custom_data[d.name] = d.value;
        });
    }

    return mappedData;
}

function cleanupData(mappedData) {
    if (mappedData.match_keys) {
        let userData = {};

        for (let userDataKey in mappedData.match_keys) {
            if (mappedData.match_keys[userDataKey]) {
                userData[userDataKey] = mappedData.match_keys[userDataKey];
            }
        }

        mappedData.match_keys = userData;
    }

    if (mappedData.custom_data) {
        let customData = {};

        for (let customDataKey in mappedData.custom_data) {
            if (mappedData.custom_data[customDataKey] || customDataKey === 'value') {
                customData[customDataKey] = mappedData.custom_data[customDataKey];
            }
        }

        mappedData.custom_data = customData;
    }

    return mappedData;
}

function addEcommerceData(eventData, mappedData) {
    let currencyFromItems = '';
    let valueFromItems = 0;

    if (eventData.items && eventData.items[0]) {
        mappedData.contents = {};
        mappedData.content_type = 'product';
        currencyFromItems = eventData.items[0].currency;

        eventData.items.forEach((d, i) => {
            let content = {};

            if (d.item_id) content.id = d.item_id;
            if (d.quantity) content.quantity = d.quantity;
            if (d.item_brand) content.brand = d.item_brand;
            if (d.item_category) content.category = d.item_category;

            if (d.price) {
                content.price = d.price;
                valueFromItems += d.quantity ? d.quantity * d.price : d.price;
            }

            mappedData.contents[i] = content;
        });
    }

    if (eventData['x-ga-mp1-ev']) mappedData.value = eventData['x-ga-mp1-ev'];
    else if (eventData['x-ga-mp1-tr']) mappedData.value = eventData['x-ga-mp1-tr'];
    else if (eventData.value) mappedData.value = eventData.value;

    if (eventData.currency) mappedData.currency = eventData.currency;
    else if (currencyFromItems) mappedData.currency = currencyFromItems;

    if (eventData.order_id) mappedData.order_id = eventData.order_id;
    else if (eventData.transaction_id) mappedData.order_id = eventData.transaction_id;

    if (mappedData.event_name === 'Purchase') {
        if (!mappedData.currency) {
            mappedData.currency = 'USD';
        }

        if (!mappedData.value) {
            mappedData.value = valueFromItems ? valueFromItems : 0;
        }
    }

    return mappedData;
}

function addUserData(eventData, mappedData) {
    if (eventData.email) mappedData.match_keys.email = eventData.email;
    else if (eventData.match_keys && eventData.match_keys.email_address) mappedData.match_keys.email = eventData.match_keys.email_address;
    else if (eventData.match_keys && eventData.match_keys.email) mappedData.match_keys.email = eventData.match_keys.email;

    if (eventData.phone) mappedData.match_keys.phone = eventData.phone;
    else if (eventData.match_keys && eventData.match_keys.phone_number) mappedData.match_keys.phone = eventData.match_keys.phone_number;

    if (eventData.gender) mappedData.match_keys.gen = eventData.gender;

    if (eventData.doby) mappedData.match_keys.doby = eventData.doby;
    if (eventData.dobm) mappedData.match_keys.dobm = eventData.dobm;
    if (eventData.dobd) mappedData.match_keys.dobd = eventData.dobd;

    if (eventData.lastName) mappedData.match_keys.ln = eventData.lastName;
    else if (eventData.LastName) mappedData.match_keys.ln = eventData.LastName;
    else if (eventData.nameLast) mappedData.match_keys.ln = eventData.nameLast;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.last_name) mappedData.match_keys.ln = eventData.match_keys.address.last_name;

    if (eventData.firstName) mappedData.match_keys.fn = eventData.firstName;
    else if (eventData.FirstName) mappedData.match_keys.fn = eventData.FirstName;
    else if (eventData.nameFirst) mappedData.match_keys.fn = eventData.nameFirst;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.first_name) mappedData.match_keys.fn = eventData.match_keys.address.first_name;

    if (eventData.fi) mappedData.match_keys.fi = eventData.fi;

    if (eventData.city) mappedData.match_keys.ct = eventData.city;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.city) mappedData.match_keys.ct = eventData.match_keys.address.city;

    if (eventData.state) mappedData.match_keys.st = eventData.state;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.region) mappedData.match_keys.st = eventData.match_keys.address.region;

    if (eventData.zip) mappedData.match_keys.zip = eventData.zip;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.postal_code) mappedData.match_keys.zip = eventData.match_keys.address.postal_code;

    if (eventData.countryCode) mappedData.match_keys.country = eventData.countryCode;
    else if (eventData.country) mappedData.match_keys.country = eventData.country;
    else if (eventData.match_keys && eventData.match_keys.address && eventData.match_keys.address.country) mappedData.match_keys.country = eventData.match_keys.address.country;

    if (eventData.madid) mappedData.match_keys.madid = eventData.madid;

    if (eventData.external_id) mappedData.match_keys.external_id = eventData.external_id;
    else if (eventData.user_id) mappedData.match_keys.external_id = eventData.user_id;
    else if (eventData.userId) mappedData.match_keys.external_id = eventData.userId;

    if (eventData.lead_id) mappedData.match_keys.lead_id = eventData.lead_id;
    else if (eventData.leadId) mappedData.match_keys.lead_id = eventData.leadId;

    return mappedData;
}

function determinateIsLoggingEnabled() {
    const containerVersion = getContainerVersion();
    const isDebug = !!(
        containerVersion &&
        (containerVersion.debugMode || containerVersion.previewMode)
    );

    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'no') {
        return false;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}
