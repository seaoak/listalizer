// preload.js for main window

const { ipcRenderer } = require('electron');

//===========================================================================
// helper function
function compareBigInt(a, b) {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
}

//===========================================================================
function createRow(dom, info) {
    const wrapper = dom.createElement('li');
    const icon = dom.createElement('img');
    icon.src = info.iconUrl;
    [].concat(icon, ['username', 'displayname', 'text', 'timestamp'].map(label => {
        const elem = dom.createElement('span');
        elem.innerHTML = info[label];
        return elem;
    })).forEach(elem => {
        elem.className = 'tweenize-timeline-field';
        wrapper.appendChild(elem);
    });
    wrapper.className = 'tweenize-timeline-row';
    wrapper.setAttribute('data-status-id', info.statusId);
    info.isUpdated = false; // always clear the flag
    return wrapper;
}

function getStatusId(row) {
    return BigInt(row.getAttribute('data-status-id'));
}

//===========================================================================
const tweetTable = {};

function updateView(dom) {
    const parent = dom.getElementById('tweenize-timeline');
    const sortedList = Object.values(tweetTable).sort((a, b) => compareBigInt(a.statusId, b.statusId));
    let pointer = parent.firstChild; // may be null
    sortedList.forEach(tweet => {
        while (pointer) {
            if (getStatusId(pointer) >= tweet.statusId) break;
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
ipcRenderer.on('new-tweets-are-arrived', (_event, tweets) => {
    Object.values(tweets).forEach(tweet => {
        tweetTable[tweet.statusId] = Object.seal(tweet); // may overwrite
    });
    updateView(document);
});

window.addEventListener('DOMContentLoaded', () => {
    const parent = document.getElementById('tweenize-timeline');
    Array.from(parent.childNodes).forEach(elem => elem.remove());
});
