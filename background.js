const MILLISECONDS_PER_UPDATE = 30;

let tabScreenshots = {};
let tabOrder = [];
let updateRate = "";
let tabPreviewRatio = 0;

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

function init() {
    // Get the possible settings from storage to see if they have already been set before.
    chrome.storage.sync.get(["updateRate", "tabBarVisibility", "tabBarHeight", "tabPreviewRatio"], function(data) {

        // If they haven't been set, then set to the default values.
        let defaultSettings = {};
        if(!data.updateRate) {
            defaultSettings.updateRate = "update-rate-continuous";
        }
        if(!data.tabBarVisibility) {
            defaultSettings.tabBarVisibility = "tab-bar-visibility-yes";
        }
        if(!data.tabBarHeight) {
            defaultSettings.tabBarHeight = 20;
        }
        if(!data.tabPreviewRatio) {
            defaultSettings.tabPreviewRatio = 0.1;
        }
        // If there is any default value to set, do it. Otherwise, all settings have already been set.
        if(Object.keys(defaultSettings).length !== 0) {
            chrome.storage.sync.set(defaultSettings);
        }
        // Save for usage in below functions.
        updateRate = data.updateRate || defaultSettings.updateRate;
        tabPreviewRatio = data.tabPreviewRatio || defaultSettings.tabPreviewRatio;
        
        // Update the tab screenshot every time we create tabs.
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
            if(changeInfo.status == "complete") {
                GetTabScreenshot();
            }
        })

        // Update the tab screenshot every time we switch tabs.
        chrome.tabs.onActivated.addListener(function(activeInfo) {
            GetTabScreenshot();
        });

        // Update the tab screenshot every `MILLISECONDS_PER_UPDATE` milliseconds, as long as we're not currently getting the tab screenshot.
        if(updateRate == "update-rate-continuous") {
            let lock = false;
            setInterval(function() {
                if(!lock) {
                    lock = true;
                    GetTabScreenshot(function() {
                        lock = false;
                    });
                }
            }, MILLISECONDS_PER_UPDATE);
        }

        // Upon receiving a message from client-zirconia.js, switch to the specified tab.
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            chrome.tabs.update(tabOrder[request], {active: true}, function(tab) { });
        });

        // Updates the order of the tabs, gets a screenshot of the current active tab, and saves it to our dictionary.
        function GetTabScreenshot(callback) {
            chrome.tabs.query({ currentWindow: true }, function(tabs) {
                // Abort if the user is currently not focused on any window.
                if(tabs.length == 0) {
                    if(callback) callback();
                    return;
                }

                // Loop through all the tabs in the current window, store their order, and determine which one is active.
                let currentTabId = -1;
                tabOrder = [];
                for(tab of tabs) {
                    tabOrder.push(parseInt(tab.id));

                    if(!(tab.id in tabScreenshots)) {
                        tabScreenshots[tab.id] = null;
                    }

                    if(tab.active) {
                        currentTabId = tab.id;
                    }
                }

                // Get a screenshot of the active tab and store it.
                chrome.tabs.captureVisibleTab({format: "jpeg", quality: Math.round(100*tabPreviewRatio)}, function(dataUrl) {
                    tabScreenshots[currentTabId] = dataUrl;
                    chrome.storage.local.set({tabScreenshots, tabOrder}, callback);
                });
            });
        }
        
    });
}