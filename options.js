let formUpdateRate = document.getElementById("update-rate");
let formTabBarVisibility = document.getElementById("tab-bar-visibility");
let formTabBarHeight = document.getElementById("tab-bar-height");
let formTabPreviewRatio = document.getElementById("tab-preview-ratio");
let closeButton = document.getElementById("close-button");

function constructOptions() {
    // Get all settings values and update all fields to match saved values.
    chrome.storage.sync.get(["updateRate", "tabBarVisibility", "tabBarHeight", "tabPreviewRatio"], function(data) {
        if(data.updateRate) {
            formUpdateRate[data.updateRate].checked = true;
        }
        if(data.tabBarVisibility) {
            formTabBarVisibility[data.tabBarVisibility].checked = true;
        }
        if(data.tabBarHeight) {
            formTabBarHeight["tab-bar-height"].value = data.tabBarHeight;
        }
        if(data.tabPreviewRatio) {
            formTabPreviewRatio["tab-preview-ratio"].value = data.tabPreviewRatio;
        }
    });

    // Add a listener to all settings values, to detect when changes have been made. Save all changes immediately.
    formUpdateRate.addEventListener("change", function(event) {
        chrome.storage.sync.set({ updateRate: event.target.id });
    });
    formTabBarVisibility.addEventListener("change", function(event) {
        chrome.storage.sync.set({ tabBarVisibility: event.target.id });
    });
    formTabBarHeight.addEventListener("change", function(event) {
        event.target.value = Math.min(Math.max(event.target.value, 1), 300);
        chrome.storage.sync.set({ tabBarHeight: parseInt(event.target.value) });
    });
    formTabPreviewRatio.addEventListener("change", function(event) {
        event.target.value = Math.min(Math.max(event.target.value, 0.01), 0.50);
        chrome.storage.sync.set({ tabPreviewRatio: parseFloat(event.target.value) });
    });

    // Add a listener to the close button that reloads all tabs and restarts the extension.
    closeButton.addEventListener("click", function(event) {
        // Warn the user that all tabs will be refreshed.
        if(confirm("This will refresh all tabs in all windows. If you press cancel, most changes will not take effect until you manually refresh your tabs and restart the extension. Would you like to automatically do this now?")) {
            refreshAllTabs(function() {
                chrome.runtime.reload();
            });
        }
    });

    // Disallow the usage of Enter to submit the form
    document.addEventListener("keydown", function(event) {
        if(event.keyCode == 13 /* ENTER */) {
            event.preventDefault();
            return false;
        }
    });
}

// Refreshes all tabs in all windows.
function refreshAllTabs(callback) {
    chrome.tabs.query({}, function(tabs) {
        refreshAllTabsQuery(tabs, callback);
    });
}

// Recursively refreshes all tabs, and calls `callback` once it's done.
function refreshAllTabsQuery(tabs, callback) {
    if(tabs.length > 0) {
        let tabToRemove = tabs.shift();
        chrome.tabs.reload(tabToRemove.id, {}, function() {
            refreshAllTabsQuery(tabs, callback);
        });
    }
    else {
        callback();
    }
}

constructOptions();