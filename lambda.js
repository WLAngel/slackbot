const https = require('https');
const querystring = require('querystring');
const message_data = require('./data.json');

const token = process.env.slack_token || '';
const channel = process.env.slack_channel || '';
const message = process.env.slack_message || today_message(message_data);
const atHere = process.env.slack_atHere || false;
const as_user = process.env.slack_as_user || true;
const hostname = 'slack.com';

const post_payload = {
    channel,
    text: atHere ? `@here ${message}` : message,
    as_user,
    parse: 'full'
};

const test_options = slack_options('POST', '/api/api.test');
const post_options = slack_options('POST', '/api/chat.postMessage', post_payload);

function today_message(message_array) {
    Date.prototype.getDOY = function () {
        var onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil((this - onejan) / 86400000);
    }
    const today = new Date();
    const daynum = today.getDOY();
    return message_array[daynum % message_array.length]
}

function slack_options(method, path, payload) {
    if (payload)
        payload.token = token;
    return {
        hostname,
        path: payload ? path + '?' + querystring.stringify(payload) : path,
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
}

function slack(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(res.statusCode);
                console.log(data);
                if (res.statusCode === 200) {
                    let json = JSON.parse(data);
                    if (json.ok)
                        resolve(json);
                    else
                        reject(data);
                } else {
                    reject(data);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`error: ${err}`);
        });
        req.end();
    });
}

function delay(value, ms = 3000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(value);
        }, ms);
    });
}

exports.test = async () => {
    return new Promise((resolve, reject) => {
        slack(test_options)
            .then(() => {
                return slack(post_options);
            })
            .then((data) => {
                const delete_payload = {
                    channel: data.channel,
                    ts: data.ts,
                    as_user
                };
                const delete_options = slack_options('POST', '/api/chat.delete', delete_payload);
                return delay(delete_options, 5000);
            })
            .then((delete_options) => {
                return slack(delete_options);
            })
            .then(() => {
                resolve('Done');
            })
            .catch((err) => {
                reject(err);
            });
    });
};

exports.handler = async () => {
    return new Promise((resolve, reject) => {
        slack(test_options)
            .then(() => {
                return slack(post_options);
            })
            .then(() => {
                resolve('Done');
            })
            .catch((err) => {
                reject(err);
            });
    });
};