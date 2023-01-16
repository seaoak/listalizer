// preload.js for main window

const { ipcRenderer } = require('electron');

//===========================================================================
// helper function
function compareStatusId(a, b) {
    const x = BigInt(a);
    const y = BigInt(b);
    if (x > y) return 1;
    if (x < y) return -1;
    return 0;
}

function toSimpleLocalTime(str) {
    // convert to simple LocalTime string
    const d = new Date(str);
    const result = [1 + d.getMonth(), '/', d.getDate(), ' ', d.getHours(), ':', d.getMinutes()]
        .map(x => (typeof x === 'string') ? x : x.toString().padStart(2, '0'))
        .join('');
    return result;
}

//===========================================================================
function createRow(dom, info) {
    const wrapper = dom.createElement('li');
    const icon = dom.createElement('img');
    icon.src = info.iconUrl;
    icon.className = `tweenizer-timeline-field tweenizer-timeline-icon`;
    [].concat(icon, ['username', 'displayname', 'textHTML', 'timestamp'].map(label => {
        const elem = dom.createElement('span');
        let value = info[label];
        if (label === 'timestamp') value = toSimpleLocalTime(value);
        elem.innerHTML = value;
        elem.className = `tweenizer-timeline-field tweenizer-timeline-${label}`;
        return elem;
    })).forEach(elem => {
        wrapper.appendChild(elem);
    });
    wrapper.className = 'tweenizer-timeline-row';
    wrapper.setAttribute('data-status-id', info.statusId);
    info.isUpdated = false; // always clear the flag
    return wrapper;
}

function getStatusId(row) {
    return row.getAttribute('data-status-id');
}

//===========================================================================
const tweetTable = {};

function updateView(dom) {
    const parent = dom.getElementById('tweenizer-timeline');
    const sortedList = Object.keys(tweetTable).map(id => BigInt(id)).sort().map(id => tweetTable[id]);
    let pointer = parent.firstChild; // may be null
    sortedList.forEach(tweet => {
        while (pointer) {
            if (compareStatusId(getStatusId(pointer), tweet.statusId) >= 0) break;
            pointer = pointer.nextSibling;
        }
        if (!pointer) {
            parent.appendChild(createRow(dom, tweet)); // pointer is still null
            return;
        }
        if (getStatusId(pointer) === tweet.statusId) {
            if (tweet.isUpdated) {
                const next = pointer.nextSibling; // may be null
                parent.replaceChild(createRow(dom, tweet), pointer); // drop old DOM element
                pointer = next;
            }
            return;
        }
        parent.insertBefore(createRow(dom, tweet), pointer);
    });
}

//===========================================================================
let isReady = false;

ipcRenderer.on('new-tweets-are-arrived', (_event, tweets) => {
    Object.values(tweets).forEach(tweet => {
        tweetTable[tweet.statusId] = Object.seal(tweet); // may overwrite
    });
    if (isReady) updateView(document);
});

window.addEventListener('DOMContentLoaded', () => {
    const parent = document.getElementById('tweenizer-timeline');
    Array.from(parent.childNodes).forEach(elem => elem.remove());
    isReady = true;
    updateView(document);
});
