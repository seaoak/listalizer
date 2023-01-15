// preload.js for Twitter timeline page

//===========================================================================
// helper function
function querySelectorOnce(dom, ...selectors) {
    if (selectors.length == 0) throw new Error(`querySelectorOnce(): Too few arguments`);
    return selectors.reduce((acc, selector) => {
        const matched = acc.querySelectorAll(selector);
        if (matched.length == 0) throw new Error(`querySelectorOnce(): no match for '${selector}'`);
        if (matched.length > 1) throw new Error(`querySelectorOnce(): too many matching for '${selector}'`);
        return matched[0];
    }, dom);
}

//===========================================================================
// processing
function extractTweets(dom) {
    // icon: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="Tweet-User-Avatar"]')[0].querySelectorAll('img')[0]
    // display_name: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="User-Names"]')[0].querySelectorAll('span :not(:has(*))')[0].innerHTML
    // username: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="User-Names"]')[0].querySelectorAll('a')[0].getAttribute('href').replace('/', '')
    // timestamp: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="User-Names"]')[0].querySelectorAll('time')[0].getAttribute('datetime')
    // status_id: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="User-Names"]')[0].querySelectorAll('time')[0].parentElement.href.split('/').pop()
    // text: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="tweetText"]')[0]
    // attached_video: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[data-testid="tweetPhoto"]')[0].querySelectorAll('video')[0]
    // attached_img_0: document.querySelectorAll('article[role="article"]')[2].querySelectorAll('div[data-testid="tweetPhoto"]')[0].querySelectorAll('img')[0]
    // attached_img_1: document.querySelectorAll('article[role="article"]')[2].querySelectorAll('div[data-testid="tweetPhoto"]')[1].querySelectorAll('img')[0]
    // attached_img_2: document.querySelectorAll('article[role="article"]')[2].querySelectorAll('div[data-testid="tweetPhoto"]')[2].querySelectorAll('img')[0]
    // attached_img_3: document.querySelectorAll('article[role="article"]')[2].querySelectorAll('div[data-testid="tweetPhoto"]')[3].querySelectorAll('img')[0]
    // attention: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[role="group"]')[0].querySelectorAll('span :not(:has(*))')[0].innerHTML
    // reply: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[role="group"]')[0].querySelectorAll('span :not(:has(*))')[1].innerHTML
    // retweet: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[role="group"]')[0].querySelectorAll('span :not(:has(*))')[2].innerHTML
    // like: document.querySelectorAll('article[role="article"]')[0].querySelectorAll('div[role="group"]')[0].querySelectorAll('span :not(:has(*))')[3].innerHTML
    return Array.from(dom.querySelectorAll('article[role="article"]')).map(argTweet => {
        const [tweet, quote] = (() => {
            const quoteElemensts = argTweet.querySelectorAll('div[role="link"]');
            if (quoteElemensts.length > 1) throw new Error('extractTweets(): unexpected HTML: too many quote elemnts');
            if (quoteElemensts.length == 0) return [argTweet, null];
            const cloned = argTweet.cloneNode(true); // deep copy (including subtree)
            const quote = cloned.querySelector('div[role="link"]');
            quote.remove();
            window.console.log('detect QuoteLink');
            window.console.dir(quote);
            return [cloned, quote];
        })();
        const iconUrl = querySelectorOnce(tweet, 'div[data-testid="Tweet-User-Avatar"]', 'img').src;
        const displayName = querySelectorOnce(tweet, 'div[data-testid="User-Names"]').querySelectorAll('span :not(:has(*))')[0].innerHTML;
        const username = querySelectorOnce(tweet, 'div[data-testid="User-Names"]').querySelectorAll('a')[0].getAttribute('href').replace('/', ''); // multiple A elements may exist
        const timestamp = querySelectorOnce(tweet, 'div[data-testid="User-Names"]', 'time').getAttribute('datetime');
        const statusId = querySelectorOnce(tweet, 'div[data-testid="User-Names"]', 'time').parentElement.href.split('/').pop();
        const textHTML = querySelectorOnce(tweet, 'div[data-testid="tweetText"]').innerHTML;
        const attachedItems = Array.from(tweet.querySelectorAll('div[data-testid="tweetPhoto"]')).map(elem => {
            const videoList = elem.querySelectorAll('video');
            if (videoList.length > 1) throw new Error('extractTweets(): unexpected HTML: too many attached vidoes');
            const photoList = elem.querySelectorAll('img');
            if (photoList.length > 1) throw new Error('extractTweets(): unexpected HTML: too many attached photos');
            if ((videoList.length == 0) && (photoList.length == 0)) throw new Error('extractTweets(): unexpected HTML: no attached file');
            if ((videoList.length == 1) && (photoList.length == 1)) {
                window.console.warn('extractTweets(): ignore a thumbnail of attached video');
            }
            return (videoList[0] || photoList[0]).outerHTML; // prioritize video over thumbnail
        });
        const statAttention = querySelectorOnce(tweet, 'div[role="group"]').querySelectorAll('span :not(:has(*))')[0].innerHTML || "0";
        const statReply = querySelectorOnce(tweet, 'div[role="group"]').querySelectorAll('span :not(:has(*))')[1].innerHTML || "0";
        const statRetweet = querySelectorOnce(tweet, 'div[role="group"]').querySelectorAll('span :not(:has(*))')[2].innerHTML || "0";
        const statLike = querySelectorOnce(tweet, 'div[role="group"]').querySelectorAll('span :not(:has(*))')[3].innerHTML || "0";

        return Object.freeze({
            iconUrl,
            displayName,
            username,
            timestamp,
            statusId,
            textHTML,
            attachedItems,
            statAttention,
            statReply,
            statRetweet,
            statLike,
            quote,
        });
    });
}

function scrollToBottom(dom) {
    const list = dom.querySelectorAll('article[role="article"]');
    if (list.length == 0) return;
    list[list.length - 1].scrollIntoView();
}

//===========================================================================
// inter-process commucation (IPC)
function postAllTweets(tweets) {
    window.console.dir(tweets);
}

//===========================================================================
const tweetTable = {};
const errorList = [];

function processPeriodically(dom, interval) {
    try {
        const tweets = extractTweets(dom);
        postAllTweets(tweets);
        tweets.forEach(tweet => {
            tweetTable[tweet.statusId] = tweet; // may overwrite
        });
        postAllTweets(Object.keys(tweetTable).length);
        if (Object.keys(tweetTable).length > 200) return; // terminate
        scrollToBottom(dom);
        errorList.length = 0;
    } catch (e) {
        errorList.push(e);
        if (errorList.length > 10) {
            window.console.dir(errorList);
            window.console.error('FATAL');
            throw e; // terminate
        }
    }
    setTimeout(() => {
        processPeriodically(dom, interval);
    }, interval);
}

window.addEventListener('DOMContentLoaded', () => {
    processPeriodically(document, 200);
});
